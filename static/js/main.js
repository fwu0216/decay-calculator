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
    
    // 自动计算触发
    const autoCalcElements = [
        'isotope', 'a0_value', 'a0_unit', 't0_date', 't0_time', 'tt_date', 'tt_time',
        'value_field', 'from_unit', 'to_unit'
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

// 工具函数：获取东八区时间
function getBeijingTime() {
    const now = new Date();
    return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

// 工具函数：验证数值
function isValidNumber(value) {
    return !isNaN(value) && isFinite(value) && value >= 0;
}
