import React, { useState, useCallback } from 'react';
import { Modal, Upload, Table, Button, Alert, Progress, Space, Tag, Tooltip, Select, message } from 'antd';
import { FileExcelOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useTranslation } from 'react-i18next';
import { useFactoryStore } from '@/store/factory.store';
import { useAuthStore } from '@/store/auth.store';
import { parseExcelFile, validateFileSize, validateFileType } from '@/utils/excelImport';
import { downloadTemplate } from '@/utils/excelTemplates';
import {
  validateInventoryRows,
  validatePartPriceRows,
  validateSupplierRows,
  bulkImportInventory,
  bulkImportPartPrices,
  bulkImportSuppliers
} from '@/services/bulkImport.service';
import type { ImportType, ValidationResult, ParsedRow, TemplateLanguage, InventoryImportRow, PartPriceImportRow, SupplierImportRow } from '@/types/bulkImport.types';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  importType: ImportType;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  open,
  onClose,
  importType,
  onSuccess
}) => {
  const { t, i18n } = useTranslation();
  const { isObserverMode } = useFactoryStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('upload');
  const [, setFile] = useState<UploadFile | null>(null);
  const [, setParsedData] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [templateLang, setTemplateLang] = useState<TemplateLanguage>(i18n.language === 'vi' ? 'vi' : 'ko');

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setImporting(false);
    setImportProgress(0);
    setError(null);
    onClose();
  }, [onClose]);

  // Handle file upload
  const handleFileChange = useCallback(async (info: { file: UploadFile }) => {
    const uploadFile = info.file;

    if (!uploadFile.originFileObj) return;

    // Validate file type
    if (!validateFileType(uploadFile.originFileObj)) {
      message.error(t('bulkImport.errors.invalidFormat'));
      return;
    }

    // Validate file size
    if (!validateFileSize(uploadFile.originFileObj)) {
      message.error(t('bulkImport.errors.fileTooLarge'));
      return;
    }

    setFile(uploadFile);
    setError(null);

    try {
      // Parse Excel
      const { rows } = await parseExcelFile(uploadFile.originFileObj, importType);

      if (rows.length === 0) {
        message.error(t('bulkImport.errors.emptyFile'));
        return;
      }

      setParsedData(rows);

      // Validate rows
      let results: ValidationResult[];
      switch (importType) {
        case 'inventory':
          results = await validateInventoryRows(rows as InventoryImportRow[]);
          break;
        case 'partPrices':
          results = await validatePartPriceRows(rows as PartPriceImportRow[]);
          break;
        case 'suppliers':
          results = await validateSupplierRows(rows as SupplierImportRow[]);
          break;
        default:
          results = [];
      }

      setValidationResults(results);
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
      message.error(t('bulkImport.errors.invalidFormat'));
    }
  }, [importType, t]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!user) return;

    const validRows = validationResults.filter(r => r.valid).map(r => r.data!);
    if (validRows.length === 0) return;

    setImporting(true);
    setStep('importing');
    setImportProgress(10);

    try {
      let result;
      switch (importType) {
        case 'inventory':
          result = await bulkImportInventory(validRows as InventoryImportRow[], user.user_id);
          break;
        case 'partPrices':
          result = await bulkImportPartPrices(validRows as PartPriceImportRow[], user.user_id);
          break;
        case 'suppliers':
          result = await bulkImportSuppliers(validRows as SupplierImportRow[], user.user_id);
          break;
      }

      setImportProgress(100);

      if (result?.success) {
        setStep('complete');
        message.success(t('bulkImport.success.imported', { count: result.insertedCount }));
        if (result.updatedCount > 0) {
          message.info(t('bulkImport.success.updated', { count: result.updatedCount }));
        }
        onSuccess();
      } else {
        setError(result?.error || t('bulkImport.errors.importFailed'));
        setStep('preview');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(t('bulkImport.errors.importFailed'));
      setStep('preview');
    } finally {
      setImporting(false);
    }
  }, [validationResults, importType, user, t, onSuccess]);

  // Template download
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(importType, templateLang);
  }, [importType, templateLang]);

  // Summary stats
  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;
  const updateCount = importType === 'inventory'
    ? validationResults.filter(r => r.valid && (r.data as InventoryImportRow)?.isUpdate).length
    : 0;
  const insertCount = validCount - updateCount;

  // Table columns for preview
  const getColumns = () => {
    const statusColumn = {
      title: t('bulkImport.validation.valid'),
      dataIndex: 'valid',
      key: 'valid',
      width: 80,
      render: (_: unknown, record: ValidationResult) => (
        record.valid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>{t('bulkImport.validation.valid')}</Tag>
        ) : (
          <Tooltip title={record.errors.map(e => t(e.message)).join(', ')}>
            <Tag color="error" icon={<CloseCircleOutlined />}>{t('bulkImport.validation.invalid')}</Tag>
          </Tooltip>
        )
      )
    };

    const baseColumns = {
      inventory: [
        { title: t('parts.partCode') || '부품코드', dataIndex: ['data', 'part_code'], key: 'part_code' },
        { title: t('inventory.quantity') || '수량', dataIndex: ['data', 'quantity'], key: 'quantity' },
        { title: t('inventory.location') || '위치', dataIndex: ['data', 'location'], key: 'location' },
      ],
      partPrices: [
        { title: t('parts.partCode') || '부품코드', dataIndex: ['data', 'part_code'], key: 'part_code' },
        { title: t('partPrice.unitPrice') || '단가', dataIndex: ['data', 'unit_price'], key: 'unit_price' },
        { title: t('partPrice.currency') || '통화', dataIndex: ['data', 'currency'], key: 'currency' },
        { title: t('partPrice.effectiveFrom') || '적용일', dataIndex: ['data', 'effective_from'], key: 'effective_from' },
      ],
      suppliers: [
        { title: t('suppliers.code') || '공급업체코드', dataIndex: ['data', 'supplier_code'], key: 'supplier_code' },
        { title: t('suppliers.name') || '이름', dataIndex: ['data', 'supplier_name'], key: 'supplier_name' },
        { title: t('suppliers.contact') || '담당자', dataIndex: ['data', 'contact_person'], key: 'contact_person' },
        { title: t('suppliers.phone') || '전화번호', dataIndex: ['data', 'phone'], key: 'phone' },
      ],
    };

    return [statusColumn, ...baseColumns[importType]];
  };

  const getTitle = () => {
    const titles: Record<ImportType, string> = {
      inventory: t('bulkImport.template.inventory'),
      partPrices: t('bulkImport.template.partPrices'),
      suppliers: t('bulkImport.template.suppliers'),
    };
    return `${t('bulkImport.title')} - ${titles[importType]}`;
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={handleClose}
      width={900}
      footer={
        step === 'complete' ? (
          <Button type="primary" onClick={handleClose}>
            {t('common.close') || '닫기'}
          </Button>
        ) : step === 'preview' ? (
          <Space>
            <Button onClick={handleClose}>{t('bulkImport.cancel')}</Button>
            <Button
              type="primary"
              onClick={handleImport}
              disabled={invalidCount > 0 || isObserverMode || importing}
              loading={importing}
            >
              {t('bulkImport.import')} ({validCount})
            </Button>
          </Space>
        ) : null
      }
    >
      {isObserverMode && (
        <Alert
          type="warning"
          message={t('factory.observerMode')}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {step === 'upload' && (
        <div>
          {/* Template Download Section */}
          <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <Space>
              <Select
                value={templateLang}
                onChange={setTemplateLang}
                style={{ width: 120 }}
                options={[
                  { value: 'ko', label: t('bulkImport.korean') },
                  { value: 'vi', label: t('bulkImport.vietnamese') },
                ]}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                {t('bulkImport.downloadTemplate')}
              </Button>
            </Space>
          </div>

          {/* File Upload Section */}
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleFileChange}
            disabled={isObserverMode}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            </p>
            <p className="ant-upload-text">{t('bulkImport.dragDropText')}</p>
            <p className="ant-upload-hint">{t('bulkImport.supportedFormats')}</p>
          </Upload.Dragger>
        </div>
      )}

      {step === 'preview' && (
        <div>
          {error && (
            <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon closable onClose={() => setError(null)} />
          )}

          {/* Summary */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
            <span>{t('bulkImport.summary.total')}: <strong>{validationResults.length}</strong></span>
            <span style={{ color: '#52c41a' }}>{t('bulkImport.summary.valid')}: <strong>{validCount}</strong></span>
            <span style={{ color: '#ff4d4f' }}>{t('bulkImport.summary.invalid')}: <strong>{invalidCount}</strong></span>
            {importType === 'inventory' && updateCount > 0 && (
              <>
                <span style={{ color: '#1890ff' }}>{t('bulkImport.summary.toUpdate')}: <strong>{updateCount}</strong></span>
                <span style={{ color: '#52c41a' }}>{t('bulkImport.summary.toInsert')}: <strong>{insertCount}</strong></span>
              </>
            )}
          </div>

          {/* Preview Table */}
          <Table
            columns={getColumns()}
            dataSource={validationResults}
            rowKey="rowIndex"
            size="small"
            scroll={{ y: 400 }}
            pagination={false}
          />
        </div>
      )}

      {step === 'importing' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Progress percent={importProgress} status="active" />
          <p style={{ marginTop: 16 }}>{t('bulkImport.importing')}</p>
        </div>
      )}

      {step === 'complete' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <p style={{ marginTop: 16, fontSize: 18 }}>{t('bulkImport.complete')}</p>
        </div>
      )}
    </Modal>
  );
};

export default BulkImportModal;
