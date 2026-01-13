import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxConfiguration } from '../entities/tax-configuration.entity';
import { EmployeeTaxInfo } from '../entities/employee-tax-info.entity';

export interface TaxCalculationResult {
  federalTax: number;
  stateTax: number;
  localTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  totalTax: number;
}

@Injectable()
export class TaxCalculationService {
  constructor(
    @InjectRepository(TaxConfiguration)
    private taxConfigRepository: Repository<TaxConfiguration>,
    @InjectRepository(EmployeeTaxInfo)
    private employeeTaxInfoRepository: Repository<EmployeeTaxInfo>,
  ) {}

  async calculateTaxes(
    businessId: string,
    employeeId: string,
    grossPay: number,
    payPeriod: string,
  ): Promise<TaxCalculationResult> {
    // Get employee tax information
    const taxInfo = await this.employeeTaxInfoRepository.findOne({
      where: { employeeId },
    });

    if (!taxInfo) {
      // Return zero taxes if no tax info configured
      return {
        federalTax: 0,
        stateTax: 0,
        localTax: 0,
        socialSecurityTax: 0,
        medicareTax: 0,
        totalTax: 0,
      };
    }

    const country = taxInfo.country || 'US';
    const annualGrossPay = this.getAnnualGrossPay(grossPay, payPeriod);

    // Calculate Federal Tax (US example)
    const federalTax = await this.calculateFederalTax(
      businessId,
      country,
      annualGrossPay,
      taxInfo,
    );

    // Calculate State Tax
    const stateTax = await this.calculateStateTax(
      businessId,
      country,
      annualGrossPay,
      taxInfo,
    );

    // Calculate Local Tax
    const localTax = await this.calculateLocalTax(
      businessId,
      country,
      annualGrossPay,
      taxInfo,
    );

    // Calculate Social Security Tax (US: 6.2% up to wage base)
    const socialSecurityTax = this.calculateSocialSecurityTax(
      grossPay,
      payPeriod,
      country,
    );

    // Calculate Medicare Tax (US: 1.45%, additional 0.9% for high earners)
    const medicareTax = this.calculateMedicareTax(
      grossPay,
      payPeriod,
      country,
      annualGrossPay,
    );

    // Convert annual taxes to period taxes
    const periodMultiplier = this.getPeriodMultiplier(payPeriod);
    const federalTaxPeriod = (federalTax / 12) * periodMultiplier;
    const stateTaxPeriod = (stateTax / 12) * periodMultiplier;
    const localTaxPeriod = (localTax / 12) * periodMultiplier;

    const totalTax =
      federalTaxPeriod +
      stateTaxPeriod +
      localTaxPeriod +
      socialSecurityTax +
      medicareTax;

    return {
      federalTax: Math.round(federalTaxPeriod * 100) / 100,
      stateTax: Math.round(stateTaxPeriod * 100) / 100,
      localTax: Math.round(localTaxPeriod * 100) / 100,
      socialSecurityTax: Math.round(socialSecurityTax * 100) / 100,
      medicareTax: Math.round(medicareTax * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
    };
  }

  private async calculateFederalTax(
    businessId: string,
    country: string,
    annualGrossPay: number,
    taxInfo: EmployeeTaxInfo,
  ): Promise<number> {
    if (taxInfo.exemptFromFederal) {
      return 0;
    }

    // Get tax brackets for the country
    const taxBrackets = await this.taxConfigRepository.find({
      where: {
        businessId,
        country,
        taxType: 'federal',
        isActive: true,
      },
      order: { minIncome: 'ASC' },
    });

    if (taxBrackets.length === 0) {
      return 0;
    }

    let tax = 0;
    let remainingIncome = annualGrossPay;

    // Apply standard deduction (simplified - should be configurable)
    const standardDeduction = this.getStandardDeduction(taxInfo.filingStatus);
    remainingIncome = Math.max(0, remainingIncome - standardDeduction);

    // Calculate tax using brackets
    for (const bracket of taxBrackets) {
      if (remainingIncome <= 0) break;
      if (annualGrossPay <= bracket.minIncome) continue;

      const taxableInBracket = Math.min(
        remainingIncome,
        bracket.maxIncome - bracket.minIncome,
      );

      if (bracket.taxRate > 0) {
        tax += (taxableInBracket * bracket.taxRate) / 100;
      }
      if (bracket.fixedAmount) {
        tax += bracket.fixedAmount;
      }

      remainingIncome -= taxableInBracket;
    }

    // Adjust for allowances
    const allowanceReduction = taxInfo.allowances * 4300; // Approximate per allowance
    tax = Math.max(0, tax - allowanceReduction);

    // Add additional withholding
    tax += taxInfo.additionalWithholding * 12; // Annualize

    return tax;
  }

  private async calculateStateTax(
    businessId: string,
    country: string,
    annualGrossPay: number,
    taxInfo: EmployeeTaxInfo,
  ): Promise<number> {
    if (taxInfo.exemptFromState) {
      return 0;
    }

    const stateTaxBrackets = await this.taxConfigRepository.find({
      where: {
        businessId,
        country,
        taxType: 'state',
        isActive: true,
      },
      order: { minIncome: 'ASC' },
    });

    if (stateTaxBrackets.length === 0) {
      return 0;
    }

    let tax = 0;
    let remainingIncome = annualGrossPay;

    for (const bracket of stateTaxBrackets) {
      if (remainingIncome <= 0) break;
      if (annualGrossPay <= bracket.minIncome) continue;

      const taxableInBracket = Math.min(
        remainingIncome,
        bracket.maxIncome - bracket.minIncome,
      );

      if (bracket.taxRate > 0) {
        tax += (taxableInBracket * bracket.taxRate) / 100;
      }
      if (bracket.fixedAmount) {
        tax += bracket.fixedAmount;
      }

      remainingIncome -= taxableInBracket;
    }

    return tax;
  }

  private async calculateLocalTax(
    businessId: string,
    country: string,
    annualGrossPay: number,
    taxInfo: EmployeeTaxInfo,
  ): Promise<number> {
    if (taxInfo.exemptFromLocal) {
      return 0;
    }

    const localTaxBrackets = await this.taxConfigRepository.find({
      where: {
        businessId,
        country,
        taxType: 'local',
        isActive: true,
      },
      order: { minIncome: 'ASC' },
    });

    if (localTaxBrackets.length === 0) {
      return 0;
    }

    let tax = 0;
    let remainingIncome = annualGrossPay;

    for (const bracket of localTaxBrackets) {
      if (remainingIncome <= 0) break;
      if (annualGrossPay <= bracket.minIncome) continue;

      const taxableInBracket = Math.min(
        remainingIncome,
        bracket.maxIncome - bracket.minIncome,
      );

      if (bracket.taxRate > 0) {
        tax += (taxableInBracket * bracket.taxRate) / 100;
      }
      if (bracket.fixedAmount) {
        tax += bracket.fixedAmount;
      }

      remainingIncome -= taxableInBracket;
    }

    return tax;
  }

  private calculateSocialSecurityTax(
    grossPay: number,
    payPeriod: string,
    country: string,
  ): number {
    if (country !== 'US') {
      return 0; // Only US has Social Security
    }

    const socialSecurityRate = 0.062; // 6.2%
    const wageBase = 160200; // 2024 wage base (should be configurable)
    const periodMultiplier = this.getPeriodMultiplier(payPeriod);
    const annualGrossPay = grossPay * (12 / periodMultiplier);

    if (annualGrossPay > wageBase) {
      // Already hit wage base
      return 0;
    }

    return grossPay * socialSecurityRate;
  }

  private calculateMedicareTax(
    grossPay: number,
    payPeriod: string,
    country: string,
    annualGrossPay: number,
  ): number {
    if (country !== 'US') {
      return 0; // Only US has Medicare
    }

    const medicareRate = 0.0145; // 1.45%
    const additionalMedicareRate = 0.009; // 0.9% for high earners
    const additionalMedicareThreshold = 200000; // Single filer threshold

    let medicareTax = grossPay * medicareRate;

    // Additional Medicare tax for high earners
    if (annualGrossPay > additionalMedicareThreshold) {
      const excess = annualGrossPay - additionalMedicareThreshold;
      const periodMultiplier = this.getPeriodMultiplier(payPeriod);
      const excessPeriod = excess / (12 / periodMultiplier);
      medicareTax += excessPeriod * additionalMedicareRate;
    }

    return medicareTax;
  }

  private getAnnualGrossPay(grossPay: number, payPeriod: string): number {
    const multiplier = this.getPeriodMultiplier(payPeriod);
    return grossPay * (12 / multiplier);
  }

  private getPeriodMultiplier(payPeriod: string): number {
    switch (payPeriod.toLowerCase()) {
      case 'weekly':
        return 52;
      case 'bi-weekly':
      case 'biweekly':
        return 26;
      case 'semi-monthly':
      case 'semimonthly':
        return 24;
      case 'monthly':
        return 12;
      default:
        return 12; // Default to monthly
    }
  }

  private getStandardDeduction(filingStatus: string): number {
    // 2024 US Standard Deductions (should be configurable)
    switch (filingStatus) {
      case 'single':
        return 14600;
      case 'married_joint':
        return 29200;
      case 'married_separate':
        return 14600;
      case 'head_of_household':
        return 21900;
      default:
        return 14600;
    }
  }
}

