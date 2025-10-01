#!/usr/bin/env python3
"""
Damco (APM) Tracking for Incentive - Maersk Portal Automation
Automates the process of tracking FCR numbers through Maersk portal and generating PDF reports
"""

import os
import sys
import time
import logging
import pandas as pd
import base64
import openpyxl  # For Excel file support
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import json
import tempfile
from PyPDF2 import PdfMerger  # for combined report


class DamcoTrackingAutomation:
    def __init__(self, headless=True):
        self.setup_logging()
        self.driver = None
        self.wait = None
        self.headless = headless
        self.results = []
        self.user_data_dir = None
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
            
        log_filename = f"damco_tracking_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_path = os.path.join(log_dir, log_filename)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('DamcoTrackingMaersk')
        
    def setup_driver(self):
        """Setup Chrome WebDriver with options"""
        self.logger.info("🔧 Initializing Chrome WebDriver...")
        
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-background-networking")
        chrome_options.add_argument("--disable-default-apps")
        chrome_options.add_argument("--disable-sync")
        chrome_options.add_argument("--disable-translate")
        chrome_options.add_argument("--metrics-recording-only")
        chrome_options.add_argument("--mute-audio")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

        # Force unique profile directory per run to avoid "already in use"
        # Use timestamp-based unique identifier for complete isolation
        unique_id = f"{os.getpid()}_{int(time.time() * 1000)}"
        user_data_dir = tempfile.mkdtemp(prefix=f"chrome_user_data_{unique_id}_")
        chrome_options.add_argument(f"--user-data-dir={user_data_dir}")

        # Store user_data_dir for cleanup
        self.user_data_dir = user_data_dir
        
        try:
            chromedriver_paths = [
                '/usr/bin/chromedriver',
                '/usr/local/bin/chromedriver',
                'chromedriver'
            ]
            chromedriver_path = None
            for path in chromedriver_paths:
                if os.path.exists(path) or path == 'chromedriver':
                    chromedriver_path = path
                    break
            
            if not chromedriver_path:
                raise Exception("ChromeDriver not found. Please install matching version.")
                
            service = Service(chromedriver_path)
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.wait = WebDriverWait(self.driver, 20)
            
            os.makedirs("results/pdfs", exist_ok=True)
            self.logger.info(f"✅ Chrome WebDriver setup completed using: {chromedriver_path}")
            return True
        except WebDriverException as e:
            self.logger.error(f"❌ Failed to setup Chrome WebDriver: {e}")
            return False
            
    def navigate_to_maersk(self):
        """Navigate to Maersk tracking portal"""
        try:
            self.logger.info("🌐 Navigating to Maersk tracking portal...")
            self.driver.get("https://www.maersk.com/mymaersk-scm-track/")
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            self.logger.info("📍 Successfully navigated to Maersk portal")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to navigate: {e}")
            return False
            
    def accept_cookies(self):
        try:
            self.logger.info("🍪 Checking cookie popup...")
            allow_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-test='coi-allow-all-button']"))
            )
            allow_btn.click()
            self.logger.info("✅ Cookies accepted")
            time.sleep(2)
            return True
        except TimeoutException:
            self.logger.info("⚠️ No cookie banner found")
            return True
        except Exception as e:
            self.logger.warning(f"❌ Cookie popup error: {e}")
            return False
            
    def close_coach_popup(self):
        try:
            self.logger.info("👋 Checking coach popup...")
            got_it_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-test='finishButton']"))
            )
            got_it_btn.click()
            self.logger.info("✅ Closed coach popup")
            time.sleep(2)
            return True
        except TimeoutException:
            self.logger.info("⚠️ No coach popup found")
            return True
        except Exception as e:
            self.logger.warning(f"❌ Coach popup error: {e}")
            return False
            
    def process_booking(self, booking_number, index):
        try:
            self.logger.info(f"🔍 Processing FCR {index}: {booking_number}")
            
            input_box = self.wait.until(EC.presence_of_element_located((By.ID, "formInput")))
            input_box.clear()
            input_box.send_keys(booking_number)
            
            submit_btn = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-test='form-input-button']")))
            self.driver.execute_script("arguments[0].click();", submit_btn)
            
            self.wait.until(EC.frame_to_be_available_and_switch_to_it((By.ID, "damco-track")))
            fcr_link = self.wait.until(EC.element_to_be_clickable(
                (By.XPATH, f"//div[@id='fcr_by_fcr_number']//a[contains(text(), '{booking_number}')]")
            ))
            fcr_link.click()
            
            time.sleep(5)
            pdf_filename = f"{index:03d}_{booking_number}_tracking.pdf"
            pdf_path = os.path.join("results", "pdfs", pdf_filename)
            
            pdf_data = self.driver.execute_cdp_cmd("Page.printToPDF", {
                "format": "A4",
                "printBackground": True
            })
            with open(pdf_path, "wb") as f:
                f.write(base64.b64decode(pdf_data['data']))
            
            self.logger.info(f"✅ Saved PDF {pdf_filename}")
            self.results.append({'fcr_number': booking_number, 'status': 'success', 'pdf_file': pdf_filename})
            return pdf_filename
        except Exception as e:
            self.logger.error(f"❌ Error FCR {booking_number}: {e}")
            self.results.append({'fcr_number': booking_number, 'status': 'error', 'error': str(e)})
            return None
        finally:
            self.driver.switch_to.default_content()
            
    def read_booking_numbers_from_file(self, file_path):
        try:
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".csv":
                df = pd.read_csv(file_path)
            elif ext in [".xls", ".xlsx"]:
                df = pd.read_excel(file_path, engine="openpyxl")
            else:
                raise ValueError("Unsupported file type")
            col = df.columns[0]
            bookings = [str(x).strip() for x in df[col].dropna().tolist() if str(x).strip()]
            return bookings
        except Exception as e:
            self.logger.error(f"❌ Failed to read {file_path}: {e}")
            return []
            
    def process_all_bookings(self, bookings):
        pdfs = []
        fails = []
        for i, b in enumerate(bookings, 1):
            pdf = self.process_booking(b, i)
            if pdf:
                pdfs.append(pdf)
            else:
                fails.append(b)
            time.sleep(2)
        return pdfs, fails
        
    def generate_combined_report(self, pdfs):
        if not pdfs:
            return None
        combined_path = os.path.join("results", f"damco_tracking_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        merger = PdfMerger()
        for pdf in pdfs:
            path = os.path.join("results", "pdfs", pdf)
            if os.path.exists(path):
                merger.append(path)
        merger.write(combined_path)
        merger.close()
        self.logger.info(f"✅ Combined PDF saved: {combined_path}")
        return combined_path
            
    def cleanup(self):
        try:
            if self.driver:
                self.logger.info("🔒 Closing browser and cleaning up...")
                self.driver.quit()
                self.logger.info("✅ Browser closed")

            # Clean up temporary user data directory
            if hasattr(self, 'user_data_dir') and os.path.exists(self.user_data_dir):
                import shutil
                try:
                    shutil.rmtree(self.user_data_dir)
                    self.logger.info(f"✅ Cleaned up temp directory: {self.user_data_dir}")
                except Exception as e:
                    self.logger.warning(f"⚠️ Could not remove temp directory: {str(e)}")

            self.logger.info("✅ Cleanup completed")
        except Exception as e:
            self.logger.error(f"❌ Error during cleanup: {str(e)}")
            
    def run_automation(self, file_path):
        try:
            if not self.setup_driver():
                return False
            if not self.navigate_to_maersk():
                return False
            self.accept_cookies()
            self.close_coach_popup()
            bookings = self.read_booking_numbers_from_file(file_path)
            pdfs, fails = self.process_all_bookings(bookings)
            self.generate_combined_report(pdfs)
            self.logger.info(f"🎉 Done. Success={len(pdfs)}, Fail={len(fails)}")
            return True
        finally:
            self.cleanup()


def main():
    if len(sys.argv) < 2:
        print("Usage: python damco_tracking_maersk.py <file_path>")
        sys.exit(1)
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    automation = DamcoTrackingAutomation(headless=True)
    ok = automation.run_automation(file_path)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
