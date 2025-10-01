import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface CreditCalculatorProps {
  file: File | null;
  serviceId: string;
  creditCostPerUnit: number;
  onCalculationComplete: (rowCount: number, totalCredits: number) => void;
}

export default function CreditCalculator({
  file,
  serviceId,
  creditCostPerUnit,
  onCalculationComplete
}: CreditCalculatorProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [rowCount, setRowCount] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);

  useEffect(() => {
    if (!file) {
      setRowCount(0);
      setTotalCredits(0);
      onCalculationComplete(0, 0);
      return;
    }

    calculateCredits();
  }, [file, serviceId, creditCostPerUnit]);

  const calculateCredits = async () => {
    if (!file) return;

    setIsCalculating(true);

    try {
      const text = await file.text();
      const extension = file.name.split('.').pop()?.toLowerCase();

      let count = 0;

      if (extension === 'csv') {
        const lines = text.split('\n').filter(line => line.trim());
        count = Math.max(0, lines.length - 1);
      } else if (extension === 'xlsx' || extension === 'xls') {
        count = 1;
      } else if (extension === 'pdf') {
        count = 1;
      } else {
        count = 1;
      }

      const credits = count * creditCostPerUnit;

      setRowCount(count);
      setTotalCredits(credits);
      onCalculationComplete(count, credits);
    } catch (error) {
      console.error('Error calculating credits:', error);
      setRowCount(1);
      setTotalCredits(creditCostPerUnit);
      onCalculationComplete(1, creditCostPerUnit);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mt-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Calculator className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Credit Calculation</h3>
          <p className="text-sm text-gray-600">Estimated cost for this automation</p>
        </div>
      </div>

      {isCalculating ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analyzing file...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Items Detected</p>
              <p className="text-3xl font-bold text-gray-900">{rowCount}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-1">Cost Per Item</p>
              <p className="text-3xl font-bold text-blue-600">{creditCostPerUnit}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4">
              <p className="text-sm text-blue-100 mb-1">Total Credits</p>
              <p className="text-3xl font-bold text-white">{totalCredits}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Calculation Breakdown
                </p>
                <p className="text-sm text-gray-600">
                  {rowCount} {rowCount === 1 ? 'item' : 'items'} × {creditCostPerUnit} credits = {totalCredits} total credits
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
