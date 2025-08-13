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
        t0_dt = datetime.fromisoformat(t0_str.replace('T', ' '))
        tt_dt = datetime.fromisoformat(tt_str.replace('T', ' '))
        
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
