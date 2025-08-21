from flask import Flask, render_template, request, jsonify
from datetime import datetime
import math

app = Flask(__name__)

# 常量定义
HALF_LIFE_MIN = {'F-18': 109.7, 'C-11': 20.3}
CONVERSION_FACTORS = {'Bq': 1, 'MBq': 1e6, 'GBq': 1e9, 'Ci': 3.7e10, 'mCi': 3.7e7}
UNIT_LIST = list(CONVERSION_FACTORS.keys())

def to_bq(value, unit):
    """将指定单位的值转换为Bq"""
    return value * CONVERSION_FACTORS[unit]

def from_bq(value, unit):
    """将Bq值转换为指定单位"""
    return value / CONVERSION_FACTORS[unit]

def convert_radioactivity(value, from_unit, to_unit):
    """放射性活度单位转换"""
    return from_bq(to_bq(value, from_unit), to_unit)

def decay_activity_same_unit(a0_value, a0_unit, t0_dt, tt_dt, isotope):
    """衰变计算，结果使用输入单位"""
    t_half = HALF_LIFE_MIN[isotope]
    delta_min = (tt_dt - t0_dt).total_seconds() / 60.0
    a0_bq = to_bq(a0_value, a0_unit)
    a_t_bq = a0_bq * (2 ** (-(delta_min / t_half)))
    return delta_min, from_bq(a_t_bq, a0_unit)

@app.route('/')
def index():
    """主页面"""
    return render_template('index.html', 
                         isotopes=list(HALF_LIFE_MIN.keys()),
                         units=UNIT_LIST)

@app.route('/calculate', methods=['POST'])
def calculate():
    """衰变计算API"""
    try:
        # 获取表单数据
        isotope = request.form.get('isotope')
        a0_value = float(request.form.get('a0_value', 0))
        a0_unit = request.form.get('a0_unit')
        t0_str = request.form.get('t0_time')
        tt_str = request.form.get('tt_time')
        
        # 验证输入
        if a0_value < 0:
            return jsonify({'error': '初始剂量不能为负数'})
        
        if isotope not in HALF_LIFE_MIN:
            return jsonify({'error': '无效的同位素选择'})
        
        if a0_unit not in CONVERSION_FACTORS:
            return jsonify({'error': '无效的单位选择'})
        
        # 解析时间
        t0_dt = datetime.fromisoformat(t0_str)
        tt_dt = datetime.fromisoformat(tt_str)
        
        # 计算衰变
        delta_min, a_t = decay_activity_same_unit(a0_value, a0_unit, t0_dt, tt_dt, isotope)
        
        # 格式化结果
        sign = '-' if delta_min < 0 else '+'
        dt_abs = abs(delta_min)
        h = int(dt_abs // 60)
        m = int(round(dt_abs % 60))
        dt_hm = f'{h}小时{m}分' if h > 0 else f'{m}分'
        pct = (a_t / a0_value * 100.0) if a0_value > 0 else 0.0
        
        result = {
            'delta_time': f'{sign}{dt_hm}（{delta_min:.1f} 分钟）',
            'activity': f'{a_t:.2f}',
            'unit': a0_unit,
            'percentage': f'{pct:.1f}%',
            'success': True
        }
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({'error': '输入格式错误，请检查数值和时间格式'})
    except Exception as e:
        return jsonify({'error': f'计算失败: {str(e)}'})

@app.route('/convert', methods=['POST'])
def convert():
    """单位换算API"""
    try:
        value = float(request.form.get('value', 0))
        from_unit = request.form.get('from_unit')
        to_unit = request.form.get('to_unit')
        
        if value < 0:
            return jsonify({'error': '数值不能为负数'})
        
        if from_unit not in CONVERSION_FACTORS or to_unit not in CONVERSION_FACTORS:
            return jsonify({'error': '无效的单位选择'})
        
        result_value = convert_radioactivity(value, from_unit, to_unit)
        
        return jsonify({
            'success': True,
            'result': f'{value:g} {from_unit} = {result_value:.4g} {to_unit}'
        })
        
    except ValueError:
        return jsonify({'error': '输入格式错误，请输入有效数值'})
    except Exception as e:
        return jsonify({'error': f'转换失败: {str(e)}'})

@app.route('/health')
def health():
    """健康检查端点"""
    return jsonify({'status': 'healthy', 'message': '衰变计算器运行正常'})

# 摩尔质量计算函数
def calculate_mass(M, V, c, volume_unit, concentration_unit):
    """计算质量: m = M × V × c"""
    if volume_unit == 'mL': 
        V /= 1000
    if concentration_unit == 'mmol/L': 
        c /= 1000
    formula = f"m = M × V × c = {M} × {V} × {c}"
    mass_g = M * V * c
    mass_mg = mass_g * 1000
    return round(mass_g, 4), round(mass_mg, 4), formula

def calculate_volume(m, M, c, mass_unit, concentration_unit):
    """计算体积: V = m / (M × c)"""
    if mass_unit == 'mg': 
        m /= 1000
    if concentration_unit == 'mmol/L': 
        c /= 1000
    formula = f"V = m / (M × c) = {m} / ({M} × {c})"
    volume_L = m / (M * c)
    volume_mL = volume_L * 1000
    volume_uL = volume_mL * 1000
    return round(volume_L, 4), round(volume_mL, 4), round(volume_uL, 2), formula

def calculate_concentration(m, M, V, mass_unit, volume_unit):
    """计算浓度: c = m / (M × V)"""
    if mass_unit == 'mg': 
        m /= 1000
    if volume_unit == 'mL': 
        V /= 1000
    formula = f"c = m / (M × V) = {m} / ({M} × {V})"
    c_mol_L = (m / M) / V
    c_mmol_L = c_mol_L * 1000
    return round(c_mol_L, 4), round(c_mmol_L, 4), formula

def calculate_molar_mass(m, V, c, mass_unit, volume_unit, concentration_unit):
    """反推摩尔质量: M = m / (V × c)"""
    if mass_unit == 'mg': 
        m /= 1000
    if volume_unit == 'mL': 
        V /= 1000
    if concentration_unit == 'mmol/L': 
        c /= 1000
    formula = f"M = m / (V × c) = {m} / ({V} × {c})"
    M = m / (V * c)
    return round(M, 4), formula

@app.route('/calculate_molar', methods=['POST'])
def calculate_molar():
    """摩尔质量计算API"""
    try:
        calc_type = int(request.form.get('calc_type', 0))
        molar_mass = float(request.form.get('molar_mass', 0))
        input1 = float(request.form.get('input1', 0))
        input1_unit = request.form.get('input1_unit', '')
        input2 = float(request.form.get('input2', 0))
        input2_unit = request.form.get('input2_unit', '')
        
        if calc_type == 0:  # 计算质量
            g, mg, formula = calculate_mass(molar_mass, input1, input2, input1_unit, input2_unit)
            result = f"📘 计算公式:\n{formula}\n\n📌 结果:\n需要 {g} g\n约 {mg} mg"
            
        elif calc_type == 1:  # 计算体积
            L, mL, uL, formula = calculate_volume(input1, molar_mass, input2, input1_unit, input2_unit)
            result = f"📘 计算公式:\n{formula}\n\n📌 结果:\n{L} L\n{mL} mL\n约 {uL} μL"
            
        elif calc_type == 2:  # 计算浓度
            molL, mmolL, formula = calculate_concentration(input1, molar_mass, input2, input1_unit, input2_unit)
            result = f"📘 计算公式:\n{formula}\n\n📌 浓度:\n{molL} mol/L\n{mmolL} mmol/L"
            
        elif calc_type == 3:  # 反推摩尔质量
            input3 = float(request.form.get('input3', 0))
            input3_unit = request.form.get('input3_unit', '')
            M_val, formula = calculate_molar_mass(input1, input2, input3, input1_unit, input2_unit, input3_unit)
            result = f"📘 计算公式:\n{formula}\n\n📌 摩尔质量:\n{M_val} g/mol"
            
        else:
            return jsonify({'error': '无效的计算类型'})
        
        return jsonify({'success': True, 'result': result})
        
    except ValueError as e:
        return jsonify({'error': '输入格式错误，请检查数值格式'})
    except Exception as e:
        return jsonify({'error': f'计算失败: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
