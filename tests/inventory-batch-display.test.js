const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadComponent(relativePath) {
  let definition;
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  vm.runInNewContext(source, { Component: (value) => { definition = value; } });
  const instance = {
    data: definition.data || {},
    setData(update) { this.data = Object.assign({}, this.data, update); }
  };
  return { definition, instance };
}

test('保鲜批次只展示正式商品规格数量，详情仅展开只读信息', () => {
  const { definition, instance } = loadComponent(
    'subPackage-charts/components/warehouse-freshness-management-card/warehouse-freshness-management-card.js');
  definition.methods._render.call(instance, { payload: { rows: [
    { batchId: 2576, goodsName: '香菜', productUnit: '斤', displayRestQty: '6', freshWasteDue: true },
    { batchId: 3, goodsName: '莲藕', productUnit: '斤', displayRestQty: null, displayQuantityStatus: 'UNRESOLVED' }
  ] } });
  assert.equal(instance.data.rows[0].displayRestQty, '6');
  assert.equal(instance.data.rows[0].displayTone, 'danger');
  assert.equal(instance.data.rows[1].displayRestQty, null);
  definition.methods.toggleDetails.call(instance, { currentTarget: { dataset: { rowKey: 'batch-2576' } } });
  assert.equal(instance.data.rows[0].detailOpen, true);
  assert.equal(instance.data.rows[1].detailOpen, false);
});

test('库存明细不把采购数量硬贴到商品规格，未知价格不伪装成零', () => {
  const { definition, instance } = loadComponent(
    'subPackage-charts/components/goods-stock-batch-detail-card/goods-stock-batch-detail-card.js');
  definition.observers.cardData.call(instance, { batchesByUnit: [{ unit: '斤', batches: [
    { stockBatchId: 2576, quantityStatus: 'VERIFIED', unit: '斤', inboundQty: '6', restQty: '6', unitPrice: '7', balanceOk: true },
    { stockBatchId: 3, quantityStatus: 'UNRESOLVED', unit: '斤', inboundQty: null, restQty: null, unitPrice: null, balanceOk: true }
  ] }] });
  const batches = instance.data._unitGroups[0].batches;
  assert.equal(batches[0]._restQty, '6斤');
  assert.equal(batches[0]._priceLabel, '¥7.00/斤');
  assert.equal(batches[1]._restQty, '数量待核');
  assert.equal(batches[1]._priceLabel, '单价待核');
});
