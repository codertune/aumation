#!/usr/bin/env python3
"""
Automation Script Wrapper
Provides a unified interface for executing automation scripts with proper error handling
and result reporting back to the Node.js backend.
"""

import sys
import json
import traceback
import os
from pathlib import Path

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({
                "success": False,
                "error": "Usage: script_wrapper.py <script_name> <file_path>"
            }), file=sys.stderr)
            sys.exit(1)

        script_name = sys.argv[1]
        file_path = sys.argv[2]

        if not os.path.exists(file_path):
            print(json.dumps({
                "success": False,
                "error": f"File not found: {file_path}"
            }), file=sys.stderr)
            sys.exit(1)

        automation = None
        success = False
        results = []

        if script_name == 'damco_tracking_maersk':
            from damco_tracking_maersk import DamcoTrackingAutomation
            automation = DamcoTrackingAutomation(headless=True)
            success = automation.run_automation(file_path)
            results = automation.results

        elif script_name == 'ctg_port_tracking':
            from ctg_port_tracking import CTGPortTrackingAutomation
            automation = CTGPortTrackingAutomation(headless=True)
            success = automation.run_automation(file_path)
            results = getattr(automation, 'results', [])

        elif script_name == 'example_automation':
            from example_automation import ExampleAutomation
            automation = ExampleAutomation()
            success = automation.run_automation(file_path)
            results = getattr(automation, 'results', [])

        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown script: {script_name}"
            }), file=sys.stderr)
            sys.exit(1)

        result = {
            "success": success,
            "results": results,
            "message": "Automation completed successfully" if success else "Automation failed",
            "script": script_name,
            "file": file_path
        }

        print(json.dumps(result))
        sys.exit(0 if success else 1)

    except ImportError as e:
        error_result = {
            "success": False,
            "error": f"Failed to import automation module: {str(e)}",
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()