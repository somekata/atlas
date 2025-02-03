let currentView = 'table';
let currentDataMode = 'case';
let searchFilters = [];

const dataView = document.getElementById('data-view');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');

// Switch between table and vertical views
function setView(view) {
  currentView = view;
  renderData();
}

// Toggle between case-wise and record-wise data
function setDataMode(mode) {
  currentDataMode = mode;
  renderData();
}

// Apply search based on filters
function applySearch() {
  const searchBar = document.getElementById('search-bar');
  const searchField = document.getElementById('search-field');
  const keywords = searchBar.value.split(',').map(k => k.trim());
  const field = searchField.value;

  searchFilters = keywords.map(keyword => ({ field, keyword }));
  renderData();
}

// Clear search filters
function clearSearch() {
  document.getElementById('search-bar').value = '';
  searchFilters = [];
  renderData();
}

// Filter data based on search
function filterData(data) {
  if (searchFilters.length === 0) return data;

  return data.filter(item => {
    return searchFilters.every(filter => {
      const field = filter.field;
      const keyword = filter.keyword.toLowerCase();

      if (field === 'all') {
        // 全項目から検索
        const searchableFields = [
          'caseId', // 症例番号
          'id', // 掲載番号
          'diseaseCategory', // 疾患分類
          'diseaseName', // 疾患名
          'imageType', // 写真の種類
          'pathogen', // 病原体
        ];

        // casewise と recordwise の両方に対応
        const valuesToSearch = searchableFields.map(f => {
          if (currentDataMode === 'case') {
            return f === 'caseId'
              ? item.caseId.toString().toLowerCase()
              : (item.caseInfo[f] || '').toString().toLowerCase();
          } else {
            const relatedCase = caseData.find(c => c.caseId === item.caseId);
            if (f === 'caseId') {
              return item.caseId.toString().toLowerCase();
            } else if (['pathogen', 'diseaseName'].includes(f)) {
              return relatedCase ? (relatedCase.caseInfo[f] || '').toString().toLowerCase() : '';
            } else {
              return (item[f] || '').toString().toLowerCase();
            }
          }
        });

        return valuesToSearch.some(value => value.includes(keyword));
      } else if (currentDataMode === 'case') {
        if (field === 'caseId') {
          const value = item.caseId.toString().toLowerCase();
          return value.includes(keyword);
        } else if (field === 'diseaseName') {
          const diseaseCombined = `${item.caseInfo.diseaseName} ${item.caseInfo.diseaseCategory}`.toLowerCase();
          return diseaseCombined.includes(keyword);
        } else {
          const value = (item.caseInfo[field] || '').toString().toLowerCase();
          return value.includes(keyword);
        }
      } else {
        if (field === 'diseaseName') {
          const relatedCase = caseData.find(c => c.caseId === item.caseId);
          const diseaseCombined = relatedCase
            ? `${relatedCase.caseInfo.diseaseName} ${relatedCase.caseInfo.diseaseCategory}`.toLowerCase()
            : '';
          return diseaseCombined.includes(keyword);
        } else if (['pathogen', 'diseaseName'].includes(field)) {
          const relatedCase = caseData.find(c => c.caseId === item.caseId);
          const value = relatedCase ? (relatedCase.caseInfo[field] || '').toString().toLowerCase() : '';
          return value.includes(keyword);
        } else {
          const value = (item[field] || '').toString().toLowerCase();
          return value.includes(keyword);
        }
      }
    });
  });
}



// Render table view
function renderTable(data) {
  const isCaseWise = currentDataMode === 'case';
  const tableHeaders = isCaseWise
    ? '<th>症例番号</th><th>病原体</th><th>疾患分類 / 疾患名</th><th>掲載写真</th>'
    : '<th>掲載番号</th><th>症例番号</th><th>病原体</th><th>疾患分類 / 疾患名</th><th>掲載写真 / 説明</th>';

  let html = `<table><thead><tr>${tableHeaders}</tr></thead><tbody>`;

  data.forEach(item => {
    if (isCaseWise) {
      const thumbnails = item.recordIds
        .map(recordId => {
          const record = recordData.find(r => r.id === recordId);
          return `
            <img src="thumbnail/${record.imageSrc.replace('.jpg', '_sm.jpg')}" 
     class="thumbnail" 
     onclick="enlargeImage('https://fa.kyorin.co.jp/jscm/atlas/${record.imageSrc}')" 
     alt="${record.imageType}">
          `;
        })
        .join('');
      html += `
        <tr onclick="showVerticalForItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
          <td>${item.caseId}</td>
          <td>${item.caseInfo.pathogen}</td>
          <td>${item.caseInfo.diseaseCategory} / ${item.caseInfo.diseaseName}</td>
          <td>${thumbnails}</td>
        </tr>
      `;
    } else {
      const relatedCase = caseData.find(c => c.caseId === item.caseId);
      const pathogen = relatedCase ? relatedCase.caseInfo.pathogen : 'Unknown';
      const diseaseInfo = relatedCase
        ? `${relatedCase.caseInfo.diseaseCategory} / ${relatedCase.caseInfo.diseaseName}`
        : 'Unknown';
      html += `
        <tr onclick="showVerticalForItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
          <td>${item.id}</td>
          <td>${item.caseId}</td>
          <td>${pathogen}</td>          
          <td>${diseaseInfo}</td>
          <td>
            <img src="https://fa.kyorin.co.jp/jscm/atlas/${item.imageSrc}" 
                 class="thumbnail" 
                 onclick="enlargeImage('https://fa.kyorin.co.jp/jscm/atlas/${item.imageSrc}')" 
                 alt="${item.imageType}">
            ${item.imageType}<br>
            ${item.comment || 'No Comment'}</td>
        </tr>
      `;
    }
  });

  html += '</tbody></table>';
  dataView.innerHTML = html;
}

// Show vertical view for a specific item
function showVerticalForItem(item) {
  currentView = 'vertical';
  const data = [item];
  renderVertical(data);
}

// Render vertical view
function renderVertical(data) {
  let html = '';
  data.forEach(item => {
    html += '<div class="card">';
    if (currentDataMode === 'case') {
      // Case-wise details
      html += `
        <h3><strong>症例番号</strong>: ${item.caseId}</h3>
        <p><strong>病原体の種類 / 病原体名</strong>: ${item.caseInfo.pathogenType} / ${item.caseInfo.pathogen}</p>
        <p><strong>培養条件による分類</strong>: ${item.caseInfo.cultureConditionType}</p>
        <p><strong>疾患分類 / 疾患名</strong>: ${item.caseInfo.diseaseCategory} / ${item.caseInfo.diseaseName}</p>
        <p><strong>検体材料</strong>: ${item.caseInfo.sampleMaterial}</p>
        <p><strong>性別 / 年齢層</strong>: ${item.caseInfo.gender} / ${item.caseInfo.ageGroup}</p>
        <p><strong>写真提供者/所属施設</strong>: ${item.caseInfo.provider} / ${item.caseInfo.providerInstitution}</p>
        <h4><strong>掲載写真</strong>:</h4>
      `;

      // List all records for the case
      item.recordIds.forEach(recordId => {
        const record = recordData.find(r => r.id === recordId);
        if (record) {
          html += `
            <div class="record">
              <p><strong>症例枝番</strong>: ${record.caseBranchId}</p>
              <p><strong>掲載番号</strong>: ${record.id} / 写真の種類: ${record.imageType}</p>
              <img src="https://fa.kyorin.co.jp/jscm/atlas/${record.imageSrc}" class="thumbnail" onclick="enlargeImage('https://fa.kyorin.co.jp/jscm/atlas/${record.imageSrc}')" alt="${record.imageType}">
              <p><strong>コメント</strong>: ${record.comment || 'No Comment'}</p>
              <p><strong>英語</strong>: ${record.commentEn || 'No Comment'}</p>
              <p><strong>培地</strong>: ${record.medium || 'N/A'}、<strong>培養条件</strong>: ${record.cultureGas || 'N/A'}、<strong>培養温度</strong>: ${record.cultureTemperature || 'N/A'}、<strong>培養時間</strong>: ${record.cultureDuration || 'N/A'}<hr></p>
            </div>
          `;
        }
      });
    } else {
      // Record-wise details
      const relatedCase = caseData.find(c => c.caseId === item.caseId);
      html += `
        <h3>掲載番号: ${item.id}</h3>
        <p><strong>症例番号</strong>: ${item.caseId}</p>
        <p><strong>病原体の種類 / 病原体名</strong>: ${relatedCase.caseInfo.pathogenType} / ${relatedCase.caseInfo.pathogen}</p>
        <p><strong>培養条件による分類</strong>: ${relatedCase.caseInfo.cultureConditionType}</p>
        <p><strong>疾患分類 / 疾患名</strong>: ${relatedCase.caseInfo.diseaseCategory} / ${relatedCase.caseInfo.diseaseName}</p>
        <p><strong>検体材料</strong>: ${relatedCase.caseInfo.sampleMaterial}</p>
        <p><strong>性別 / 年齢層</strong>: ${relatedCase.caseInfo.gender} / ${relatedCase.caseInfo.ageGroup}</p>
        <p><strong>写真提供者/所属施設</strong>: ${relatedCase.caseInfo.provider} / ${relatedCase.caseInfo.providerInstitution}</p>
        <h4><strong>掲載写真と説明</strong>:</h4>
        <p><strong>症例枝番</strong>: ${item.caseBranchId}</p>
        <p><strong>写真の種類</strong>: ${item.imageType}</p>
        <img src="https://fa.kyorin.co.jp/jscm/atlas/${item.imageSrc}" class="thumbnail" onclick="enlargeImage('https://fa.kyorin.co.jp/jscm/atlas/${item.imageSrc}')" alt="${item.imageType}">
        <p><strong>コメント</strong>: ${item.comment || 'No Comment'}</p>
        <p><strong>英語</strong>: ${item.commentEn || 'No Comment'}</p>
        <p><strong>培地</strong>: ${item.medium || 'N/A'}、<strong>培養条件</strong>: ${item.cultureGas || 'N/A'}、<strong>培養温度</strong>: ${item.cultureTemperature || 'N/A'}、<strong>培養時間</strong>: ${item.cultureDuration || 'N/A'}</p>
      `;
    }
    html += '</div>';
  });
  dataView.innerHTML = html;
}

// Enlarge image in modal
function enlargeImage(src) {
  modal.style.display = 'block';
  modalImage.src = src;
}

// Close modal
function closeModal() {
  modal.style.display = 'none';
}

// Render data dynamically
function renderData() {
  const data = currentDataMode === 'case' ? filterData(caseData) : filterData(recordData);
  currentView === 'table' ? renderTable(data) : renderVertical(data);
}

// Initial render
document.addEventListener('DOMContentLoaded', () => renderData());
