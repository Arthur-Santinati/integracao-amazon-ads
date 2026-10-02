import { describe, it, expect } from 'vitest';
import { ReportImportService } from '@/services/ReportImportService';

describe('ReportImportService', () => {
  const service = new ReportImportService();

  it('identifies columns in Portuguese Amazon Ads report exports', () => {
    const headers = [
      'Data',
      'Nome da campanha',
      'Impressões',
      'Cliques',
      'Gastos',
      'Vendas',
      'Pedidos',
    ];

    const detected = service.identifyColumns(headers);

    expect(detected.date).toBe('Data');
    expect(detected.campaignName).toBe('Nome da campanha');
    expect(detected.impressions).toBe('Impressões');
    expect(detected.clicks).toBe('Cliques');
    expect(detected.spend).toBe('Gastos');
    expect(detected.sales).toBe('Vendas');
    expect(detected.orders).toBe('Pedidos');
  });

  it('identifies columns in English Amazon Ads report exports', () => {
    const headers = [
      'Date',
      'Campaign Name',
      'Campaign Id',
      'Impressions',
      'Clicks',
      'Cost',
      '7 Day Total Sales',
      '7 Day Total Orders',
      'Advertised ASIN',
    ];

    const detected = service.identifyColumns(headers);

    expect(detected.date).toBe('Date');
    expect(detected.campaignName).toBe('Campaign Name');
    expect(detected.campaignId).toBe('Campaign Id');
    expect(detected.impressions).toBe('Impressions');
    expect(detected.clicks).toBe('Clicks');
    expect(detected.spend).toBe('Cost');
    expect(detected.sales).toBe('7 Day Total Sales');
    expect(detected.orders).toBe('7 Day Total Orders');
    expect(detected.asin).toBe('Advertised ASIN');
  });

  it('correctly parses varied currency and percentage formats', () => {
    expect(service.parseNumeric('R$ 1.250,50')).toBe(1250.5);
    expect(service.parseNumeric('$1,250.50')).toBe(1250.5);
    expect(service.parseNumeric('45,20')).toBe(45.2);
    expect(service.parseNumeric('15.4%')).toBe(15.4);
    expect(service.parseNumeric(120)).toBe(120);
    expect(service.parseNumeric('')).toBe(0);
    expect(service.parseNumeric(null)).toBe(0);
  });

  it('parses dates in ISO and Brazilian formats', () => {
    const isoDate = service.parseDate('2026-09-25');
    expect(isoDate).not.toBeNull();
    expect(isoDate?.getFullYear()).toBe(2026);
    expect(isoDate?.getMonth()).toBe(8); // 0-indexed: September is 8
    expect(isoDate?.getDate()).toBe(25);

    const brDate = service.parseDate('25/09/2026');
    expect(brDate).not.toBeNull();
    expect(brDate?.getFullYear()).toBe(2026);
    expect(brDate?.getDate()).toBe(25);
  });

  it('successfully parses and normalizes a multi-row CSV string', () => {
    const csvContent =
      'Data,Nome da campanha,Impressões,Cliques,Gastos,Vendas,Pedidos\n' +
      '2026-09-25,SP - Fone Bluetooth,1500,30,45.00,250.00,2\n' +
      '2026-09-26,SP - Fone Bluetooth,1600,35,52.50,300.00,3\n';

    const result = service.parseCSV(csvContent, 'test.csv');

    expect(result.success).toBe(true);
    expect(result.totalRows).toBe(2);
    expect(result.validRows.length).toBe(2);
    expect(result.validRows[0].campaignName).toBe('SP - Fone Bluetooth');
    expect(result.validRows[0].impressions).toBe(1500);
    expect(result.validRows[0].clicks).toBe(30);
    expect(result.validRows[0].spend).toBe(45);
    expect(result.validRows[0].sales).toBe(250);
  });

  it('returns failure when file has no campaign name column', () => {
    const invalidCSV = 'ColunaA,ColunaB,ColunaC\n1,2,3\n4,5,6\n';
    const result = service.parseCSV(invalidCSV, 'invalid.csv');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
