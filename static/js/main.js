// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 设置当前时间
    setCurrentTime();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 自动计算
    autoCalculate();
}

function setCurrentTime() {
    // 获取东八区时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // 格式化日期和时间
    const dateString = beijingTime.toISOString().slice(0, 10);
    const timeString = beijingTime.toISOString().slice(11, 16);
    
    const t0Date = document.getElementById('t0_date');
    const t0Time = document.getElementById('t0_time');
    const ttDate = document.getElementById('tt_date');
    const ttTime = document.getElementById('tt_time');
    
    if (t0Date) t0Date.value = dateString;
    if (t0Time) t0Time.value = timeString;
    if (ttDate) ttDate.value = dateString;
    if (ttTime) ttTime.value = timeString;
}

function bindEventListeners() {
    // 标签页切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
    
    // NOW按钮
    const nowBtn = document.getElementById('now_btn');
    if (nowBtn) {
        nowBtn.addEventListener('click', function() {
            setCurrentTime();
            autoCalculate();
        });
    }
    
    // 计算按钮
    const calcBtn = document.getElementById('calc_btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', calculateDecay);
    }
    
    // 复制按钮
    const copyBtn = document.getElementById('copy_btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyResult);
    }
    
    // 单位换算按钮
    const convertBtn = document.getElementById('convert_btn');
    if (convertBtn) {
        convertBtn.addEventListener('click', performConversion);
    }
    
    // 摩尔质量计算按钮
    const molarCalcBtn = document.getElementById('molar_calc_btn');
    if (molarCalcBtn) {
        molarCalcBtn.addEventListener('click', performMolarCalculation);
    }
    
    // 摩尔质量计算器事件监听
    const calcTypeSelect = document.getElementById('calc_type');
    const reagentSelect = document.getElementById('reagent');
    
    if (calcTypeSelect) {
        calcTypeSelect.addEventListener('change', updateMolarUI);
    }
    
    if (reagentSelect) {
        reagentSelect.addEventListener('change', updateMolarUI);
    }
    
    // 自动计算触发
    const autoCalcElements = [
        'isotope', 'a0_value', 'a0_unit', 't0_date', 't0_time', 'tt_date', 'tt_time',
        'value_field', 'from_unit', 'to_unit',
        'calc_type', 'reagent', 'custom_molar', 'input1_field', 'input1_unit', 
        'input2_field', 'input2_unit', 'input3_field', 'input3_unit'
    ];
    
    autoCalcElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', autoCalculate);
            element.addEventListener('input', autoCalculate);
        }
    });
}

function autoCalculate() {
    // 延迟执行，避免频繁计算
    clearTimeout(window.autoCalcTimeout);
    window.autoCalcTimeout = setTimeout(() => {
        calculateDecay();
        performConversion();
        performMolarCalculation();
    }, 300);
}

async function calculateDecay() {
    const resultArea = document.getElementById('result');
    if (!resultArea) return;
    
    // 获取表单数据
    const formData = new FormData();
    formData.append('isotope', document.getElementById('isotope').value);
    formData.append('a0_value', document.getElementById('a0_value').value);
    formData.append('a0_unit', document.getElementById('a0_unit').value);
    
    // 组合日期和时间
    const t0Date = document.getElementById('t0_date').value;
    const t0Time = document.getElementById('t0_time').value;
    const ttDate = document.getElementById('tt_date').value;
    const ttTime = document.getElementById('tt_time').value;
    
    formData.append('t0_time', `${t0Date}T${t0Time}`);
    formData.append('tt_time', `${ttDate}T${ttTime}`);
    
    // 验证输入
    const a0Value = parseFloat(formData.get('a0_value'));
    if (!a0Value || a0Value < 0) {
        resultArea.textContent = '请输入有效的初始剂量。';
        resultArea.className = 'result-area error';
        return;
    }
    
    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const resultText = `Δt = ${data.delta_time}\nA(t) ≈ ${data.activity} ${data.unit}（约为 A0 的 ${data.percentage}）`;
            setResultWithHighlight(resultArea, resultText, data.activity);
        } else {
            resultArea.textContent = data.error || '计算失败';
            resultArea.className = 'result-area error';
        }
    } catch (error) {
        resultArea.textContent = '网络错误，请重试';
        resultArea.className = 'result-area error';
    }
}

function setResultWithHighlight(element, fullText, highlightText) {
    element.className = 'result-area highlight';
    
    // 创建高亮显示
    const parts = fullText.split(highlightText);
    if (parts.length > 1) {
        element.innerHTML = parts[0] + 
                          '<span class="highlight-number">' + highlightText + '</span>' + 
                          parts.slice(1).join(highlightText);
    } else {
        element.textContent = fullText;
    }
}

async function performConversion() {
    const convResult = document.getElementById('conv_result');
    if (!convResult) return;
    
    const value = parseFloat(document.getElementById('value_field').value);
    if (!value || value < 0) {
        convResult.textContent = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('value', value);
    formData.append('from_unit', document.getElementById('from_unit').value);
    formData.append('to_unit', document.getElementById('to_unit').value);
    
    try {
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            convResult.textContent = data.result;
            convResult.className = 'conv-result success';
        } else {
            convResult.textContent = data.error || '转换失败';
            convResult.className = 'conv-result error';
        }
    } catch (error) {
        convResult.textContent = '网络错误，请重试';
        convResult.className = 'conv-result error';
    }
}

async function copyResult() {
    const resultArea = document.getElementById('result');
    const copyBtn = document.getElementById('copy_btn');
    
    if (!resultArea || !copyBtn) return;
    
    let textToCopy = '';
    
    // 获取文本内容（去除HTML标签）
    if (resultArea.innerHTML) {
        // 创建临时元素来获取纯文本
        const temp = document.createElement('div');
        temp.innerHTML = resultArea.innerHTML;
        textToCopy = temp.textContent || temp.innerText || '';
    } else {
        textToCopy = resultArea.textContent || '';
    }
    
    textToCopy = textToCopy.trim();
    
    if (!textToCopy || textToCopy === '结果将显示在这里') {
        copyBtn.textContent = '无结果可复制';
        setTimeout(() => {
            copyBtn.textContent = '复制结果';
        }, 2000);
        return;
    }
    
    try {
        // 使用现代Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            // 降级到传统方法
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => {
            copyBtn.textContent = '复制结果';
        }, 2000);
    } catch (error) {
        copyBtn.textContent = '复制失败';
        setTimeout(() => {
            copyBtn.textContent = '复制结果';
        }, 2000);
    }
}

// 工具函数：格式化时间
function formatTime(date) {
    return date.toISOString().slice(0, 16);
}

// 标签页切换函数
function switchTab(tabName) {
    // 移除所有标签页按钮的active类
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // 隐藏所有标签页内容
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // 激活选中的标签页按钮
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 显示选中的标签页内容
    const activePane = document.getElementById(`${tabName}-tab`);
    if (activePane) {
        activePane.classList.add('active');
    }
}

// 摩尔质量数据
const MOLAR_MASSES = {
    'KHP(204.22)': 204.22,
    '六水氯化铝(241.43)': 241.43,
    '氢氧化钠(40.00)': 40.00,
    '无水乙酸钠(82.03)': 82.03,
    '三氟乙酸(114.02)': 114.02,
    '其他': null
};

// 摩尔质量计算器UI更新
function updateMolarUI() {
    const calcType = parseInt(document.getElementById('calc_type').value);
    const reagent = document.getElementById('reagent').value;
    const customMolarGroup = document.getElementById('custom_molar_group');
    const input3Group = document.getElementById('input3_group');
    
    // 显示/隐藏自定义摩尔质量输入
    customMolarGroup.style.display = (reagent === '其他') ? 'block' : 'none';
    
    // 显示/隐藏第三行输入
    input3Group.style.display = (calcType === 3) ? 'block' : 'none';
    
    // 更新标签和占位符
    updateMolarLabels(calcType);
}

// 更新摩尔质量计算器标签
function updateMolarLabels(calcType) {
    const labelConfigs = [
        { label1: '体积:', placeholder1: '请输入体积', label2: '浓度:', placeholder2: '请输入浓度' },
        { label1: '质量:', placeholder1: '请输入质量', label2: '浓度:', placeholder2: '请输入浓度' },
        { label1: '质量:', placeholder1: '请输入质量', label2: '体积:', placeholder2: '请输入体积' },
        { label1: '质量:', placeholder1: '请输入质量', label2: '体积:', placeholder2: '请输入体积', label3: '浓度:', placeholder3: '请输入浓度' }
    ];
    
    const config = labelConfigs[calcType];
    
    document.getElementById('input1_label').textContent = config.label1;
    document.getElementById('input1_field').placeholder = config.placeholder1;
    document.getElementById('input2_label').textContent = config.label2;
    document.getElementById('input2_field').placeholder = config.placeholder2;
    
    if (calcType === 3) {
        document.getElementById('input3_label').textContent = config.label3;
        document.getElementById('input3_field').placeholder = config.placeholder3;
    }
}

// 摩尔质量计算
async function performMolarCalculation() {
    const resultArea = document.getElementById('molar_result');
    if (!resultArea) return;
    
    try {
        const calcType = parseInt(document.getElementById('calc_type').value);
        const reagent = document.getElementById('reagent').value;
        const customMolar = parseFloat(document.getElementById('custom_molar').value);
        
        // 获取输入值
        const input1 = parseFloat(document.getElementById('input1_field').value);
        const input1Unit = document.getElementById('input1_unit').value;
        const input2 = parseFloat(document.getElementById('input2_field').value);
        const input2Unit = document.getElementById('input2_unit').value;
        
        let input3 = null;
        let input3Unit = null;
        
        if (calcType === 3) {
            input3 = parseFloat(document.getElementById('input3_field').value);
            input3Unit = document.getElementById('input3_unit').value;
        }
        
        // 验证输入
        if (!input1 || !input2 || (calcType === 3 && !input3)) {
            resultArea.textContent = '请填写所有必需的输入项。';
            resultArea.className = 'molar-result error';
            return;
        }
        
        // 获取摩尔质量
        let molarMass = MOLAR_MASSES[reagent];
        if (reagent === '其他') {
            if (!customMolar || customMolar <= 0) {
                resultArea.textContent = '请选择试剂或填写有效的自定义摩尔质量。';
                resultArea.className = 'molar-result error';
                return;
            }
            molarMass = customMolar;
        }
        
        if (!molarMass) {
            resultArea.textContent = '未找到该试剂的摩尔质量。';
            resultArea.className = 'molar-result error';
            return;
        }
        
        // 发送计算请求
        const formData = new FormData();
        formData.append('calc_type', calcType);
        formData.append('molar_mass', molarMass);
        formData.append('input1', input1);
        formData.append('input1_unit', input1Unit);
        formData.append('input2', input2);
        formData.append('input2_unit', input2Unit);
        
        if (calcType === 3) {
            formData.append('input3', input3);
            formData.append('input3_unit', input3Unit);
        }
        
        const response = await fetch('/calculate_molar', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultArea.innerHTML = data.result;
            resultArea.className = 'molar-result success';
        } else {
            resultArea.textContent = data.error || '计算失败';
            resultArea.className = 'molar-result error';
        }
    } catch (error) {
        resultArea.textContent = '网络错误，请重试';
        resultArea.className = 'molar-result error';
    }
}

// 工具函数：获取东八区时间
function getBeijingTime() {
    const now = new Date();
    return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

// 工具函数：验证数值
function isValidNumber(value) {
    return !isNaN(value) && isFinite(value) && value >= 0;
}
