1、根据原始pythonista代码，转换成可以通过github部署在render上的衰变计算器，保持功能布局不变
2、包含两部分功能，衰变计算器和活度单位换算
3、衰变计算器功能，同位素选择F-18、C-11
    初始剂量输入框  单位选择：Bq、MBq、GBq、Ci、mCi（默认选在mCi）
    初始时间设置  当前时间按钮
    目标时间设置  
    计算按钮、复制结果按钮
    结果显示单位和初始选择单位一致
4、活度单位换算
    输入框
    单位选择：Bq、MBq、GBq、Ci、mCi
    单位选择：Bq、MBq、GBq、Ci、mCi
    开始换算按钮
    结果显示
5、原始可用的pythonista代码：
# 衰变计算 + 单位换算(时间横排紧凑版)
import ui
from datetime import datetime
import clipboard

# —— 常量 ——
HALF_LIFE_MIN = {'F-18': 109.7, 'C-11': 20.3}
conversion_factors = {'Bq':1, 'MBq':1e6, 'GBq':1e9, 'Ci':3.7e10, 'mCi':3.7e7}
unit_list = list(conversion_factors.keys())
TIME_MODE = getattr(ui, 'DATE_PICKER_MODE_TIME', 'time')  # 仅时:分

# —— 单位换算 ——
def to_bq(v,u): return v*conversion_factors[u]
def from_bq(v,u): return v/conversion_factors[u]
def convert_radioactivity(v,fu,tu): return from_bq(to_bq(v,fu),tu)

# —— 衰变计算(结果用输入单位)——
def decay_activity_same_unit(a0_value, a0_unit, t0_dt, tt_dt, isotope):
    t_half = HALF_LIFE_MIN[isotope]
    delta_min = (tt_dt - t0_dt).total_seconds() / 60.0
    a0_bq = to_bq(a0_value, a0_unit)
    a_t_bq = a0_bq * (2 ** (-(delta_min / t_half)))
    return delta_min, from_bq(a_t_bq, a0_unit)

class Card(ui.View):
    def __init__(self, bg='#F7F9FF'):
        super().__init__()
        self.bg_color = bg
        self.corner_radius = 12

class App(ui.View):
    def __init__(self):
        super().__init__()
        self.name = '衰变计算 + 单位换算'
        self.bg_color = 'white'
        self.pad = 16
        self.touch_enabled = True

        # ===== 根 ScrollView =====
        self.scroll = ui.ScrollView()
        self.scroll.flex = 'WH'
        self.scroll.content_inset = (0, 0, 220, 0)
        self.add_subview(self.scroll)

        # ===== 卡片 1: 同位素 + 初始剂量 + 单位 =====
        self.card1 = Card('#F0F5FF')
        self.scroll.add_subview(self.card1)

        self.title = ui.Label(text='放射性衰变计算器', font=('HelveticaNeue-Bold', 20),
                              alignment=ui.ALIGN_CENTER, text_color='#222')
        self.card1.add_subview(self.title)

        self.iso_label = ui.Label(text='同位素', font=('Helvetica Neue', 15), text_color='#333')
        self.iso_seg = ui.SegmentedControl(segments=list(HALF_LIFE_MIN.keys()))
        self.iso_seg.selected_index = 0
        self.iso_seg.action = self._auto_calc
        self.card1.add_subview(self.iso_label); self.card1.add_subview(self.iso_seg)

        self.a0_label = ui.Label(text='初始剂量 A0', font=('Helvetica Neue', 15), text_color='#333')
        self.a0_field = ui.TextField(placeholder='例如 300.0', font=('Helvetica Neue', 16),
                                     keyboard_type=ui.KEYBOARD_DECIMAL_PAD)
        self.a0_field.border_style = 3
        self.a0_field.action = self._auto_calc
        self.card1.add_subview(self.a0_label); self.card1.add_subview(self.a0_field)

        self.unit_label = ui.Label(text='单位', font=('Helvetica Neue', 15), text_color='#333')
        self.a0_unit = ui.SegmentedControl(segments=unit_list)
        self.a0_unit.selected_index = unit_list.index('mCi')
        self.a0_unit.action = self._auto_calc
        self.card1.add_subview(self.unit_label); self.card1.add_subview(self.a0_unit)

        # ===== 卡片 2: 时间(横排紧凑) =====
        self.card2 = Card('#ECFFF1')
        self.scroll.add_subview(self.card2)

        self.t0_label = ui.Label(text='初始时间:', font=('Helvetica Neue', 15), text_color='#333')
        self.t0_time  = ui.DatePicker()
        try: self.t0_time.mode = TIME_MODE
        except Exception: pass
        self.t0_time.date = datetime.now()
        self.t0_time.action = self._auto_calc

        self.now_btn  = ui.Button(title='NOW', font=('HelveticaNeue-Bold', 16),
                                  corner_radius=10, bg_color='#F0F0F0', tint_color='#007AFF',
                                  border_width=1, border_color='#DDD')
        self.now_btn.action = self._set_now

        self.tt_label = ui.Label(text='目标时间:', font=('Helvetica Neue', 15), text_color='#333')
        self.tt_time  = ui.DatePicker()
        try: self.tt_time.mode = TIME_MODE
        except Exception: pass
        self.tt_time.date = datetime.now()
        self.tt_time.action = self._auto_calc

        for v in [self.t0_label, self.t0_time, self.now_btn, self.tt_label, self.tt_time]:
            self.card2.add_subview(v)

        # ===== 操作区 + 结果 =====
        self.calc_btn = ui.Button(title='计算', font=('HelveticaNeue-Bold', 18),
                                  corner_radius=12, bg_color='#007AFF', tint_color='white')
        self.copy_btn = ui.Button(title='复制结果', font=('Helvetica Neue', 16),
                                  corner_radius=12, bg_color='#34C759', tint_color='white')
        self.calc_btn.action = self._calculate
        self.copy_btn.action = self._copy
        self.scroll.add_subview(self.calc_btn); self.scroll.add_subview(self.copy_btn)

        self.result = ui.Label(text='结果将显示在这里', number_of_lines=0,
                               font=('Helvetica Neue', 16), text_color='#111')
        self.scroll.add_subview(self.result)

        # ===== 卡片 3: 活度单位换算器 =====
        self.card3 = Card('#F3F0FF')
        self.scroll.add_subview(self.card3)

        self.conv_title = ui.Label(text='活度单位换算器', font=('HelveticaNeue-Bold', 18),
                                   alignment=ui.ALIGN_CENTER, text_color='#222')
        self.value_field = ui.TextField(placeholder='请输入数值', font=('Helvetica Neue', 16),
                                        keyboard_type=ui.KEYBOARD_DECIMAL_PAD)
        self.value_field.border_style = 3
        self.value_field.action = self._perform_conversion
        self.from_sel = ui.SegmentedControl(segments=unit_list)
        self.to_sel   = ui.SegmentedControl(segments=unit_list)
        self.from_sel.selected_index = unit_list.index('MBq')
        self.to_sel.selected_index   = unit_list.index('mCi')
        self.from_sel.action = self._perform_conversion
        self.to_sel.action   = self._perform_conversion
        self.convert_btn = ui.Button(title='开始转换', bg_color='#007AFF', tint_color='white', corner_radius=8)
        self.convert_btn.action = self._perform_conversion
        self.conv_result = ui.Label(alignment=ui.ALIGN_CENTER, font=('Helvetica Neue', 16), text_color='#111')

        for v in [self.conv_title, self.value_field, self.from_sel, self.to_sel, self.convert_btn, self.conv_result]:
            self.card3.add_subview(v)

    # 点击空白收起键盘
    def touch_began(self, touch):
        self.end_editing()

    # —— 布局(时间行横排 + 区域降低高度)——
    def layout(self):
        self.scroll.frame = self.bounds
        x = self.pad; y = self.pad; W = self.width - 2*self.pad
        card_pad = 12

        # 卡片1
        self.card1.frame = (x, y, W, 190); y += self.card1.height + 12
        c = self.card1
        self.title.frame = (card_pad, card_pad, c.width-2*card_pad, 28)
        row_y = card_pad + 32
        self.iso_label.frame = (card_pad, row_y, 60, 26)
        self.iso_seg.frame   = (card_pad+64, row_y, c.width-card_pad*2-64, 28); row_y += 36
        self.a0_label.frame  = (card_pad, row_y, 100, 26)
        self.a0_field.frame  = (card_pad+104, row_y-2, c.width-card_pad*2-104, 34); row_y += 40
        self.unit_label.frame = (card_pad, row_y, 60, 26)
        self.a0_unit.frame    = (card_pad+64, row_y, c.width-card_pad*2-64, 28)

        # 卡片2: 两行横排
        self.card2.frame = (x, y, W, 120); y += self.card2.height + 12
        c = self.card2
        row_y = card_pad
        label_w, time_w, gap = 80, 120, 8
        # 行1: 初始时间
        self.t0_label.frame = (card_pad, row_y+4, label_w, 28)
        self.t0_time.frame  = (card_pad + label_w + gap, row_y, time_w, 36)
        self.now_btn.frame  = (self.t0_time.x + time_w + gap, row_y, 74, 36)
        # 行2: 目标时间
        row_y += 44
        self.tt_label.frame = (card_pad, row_y+4, label_w, 28)
        self.tt_time.frame  = (card_pad + label_w + gap, row_y, time_w, 36)

        # 操作区
        self.calc_btn.frame = (x, y, (W-8)//2, 44)
        self.copy_btn.frame = (x+(W-8)//2+8, y, (W-8)//2, 44); y += 52

        self.result.frame = (x, y, W, 80); y += 88

        # 卡片3(换算器)
        self.card3.frame = (x, y, W, 220); y += self.card3.height + 12
        c = self.card3
        self.conv_title.frame   = (card_pad, card_pad, c.width-2*card_pad, 24)
        self.value_field.frame  = (card_pad, card_pad+32, c.width-2*card_pad, 34)
        self.from_sel.frame     = (card_pad, card_pad+72, c.width-2*card_pad, 28)
        self.to_sel.frame       = (card_pad, card_pad+108, c.width-2*card_pad, 28)
        self.convert_btn.frame  = (card_pad, card_pad+144, c.width-2*card_pad, 40)
        self.conv_result.frame  = (card_pad, card_pad+188, c.width-2*card_pad, 24)

        self.scroll.content_size = (self.width, y + self.pad)

    # —— 富文本：仅高亮数值 —— 
    def _set_result_rich(self, full_text: str, highlight_text: str):
        """把 highlight_text 设为加粗放大+着色，其余保持默认样式"""
        try:
            attr = ui.AttributedString(full_text)
            i = full_text.find(highlight_text)
            if i >= 0:
                # 仅高亮数值
                attr[i:i+len(highlight_text)].font = ('HelveticaNeue-Bold', 22)
                attr[i:i+len(highlight_text)].color = '#007AFF'   # 想换色在这里改
            # 设置富文本并清空纯文本，避免被后续覆盖
            self.result.attributed_text = attr
            self.result.text = None
        except Exception:
            self.result.text = full_text

    # —— 事件&逻辑 ——
    def _get_dt_today(self, picker):
        t = picker.date.time()
        return datetime.combine(datetime.now().date(), t)

    def _set_now(self, sender):
        self.t0_time.date = datetime.now()
        self._auto_calc(None)

    def _auto_calc(self, sender):
        self._calculate(None)

    def _calculate(self, sender):
        a0_txt = (self.a0_field.text or '').strip()
        if not a0_txt:
            self.result.text = '请输入初始剂量。'
            return
        try:
            a0_val = float(a0_txt)
            if a0_val < 0:
                raise ValueError
        except Exception:
            self.result.text = '初始剂量格式有误，请输入非负数（可为小数）。'
            return

        iso = self.iso_seg.segments[self.iso_seg.selected_index]
        a0_unit = self.a0_unit.segments[self.a0_unit.selected_index]
        t0_dt = self._get_dt_today(self.t0_time)
        tt_dt = self._get_dt_today(self.tt_time)

        try:
            delta_min, a_t = decay_activity_same_unit(a0_val, a0_unit, t0_dt, tt_dt, iso)
        except Exception as e:
            self.result.text = f'计算失败: {e}'
            return

        sign = '-' if delta_min < 0 else '+'
        dt_abs = abs(delta_min)
        h = int(dt_abs // 60); m = int(round(dt_abs % 60))
        dt_hm = f'{h}小时{m}分' if h > 0 else f'{m}分'
        pct = (a_t / a0_val * 100.0) if a0_val > 0 else 0.0

        line1   = f'Δt = {sign}{dt_hm}（{delta_min:.1f} 分钟）'
        num_str = f'{a_t:.2f}'                      # 只高亮这个数值
        line2   = f'A(t) ≈ {num_str} {a0_unit}（约为 A0 的 {pct:.1f}%）'
        full    = line1 + '\n' + line2
        self._set_result_rich(full, num_str)

    def _copy(self, sender):
        # 复制文本（无样式）。优先取富文本字符串。
        txt = ''
        if self.result.attributed_text:
            try:
                txt = self.result.attributed_text.string
            except Exception:
                pass
        if not txt:
            txt = self.result.text or ''
        txt = txt.strip()
        if txt:
            clipboard.set(txt)
            self.copy_btn.title = '已复制 ✓'
        else:
            self.copy_btn.title = '无结果可复制'

    # —— 下半:单位换算器 —— 
    def _perform_conversion(self, sender=None):
        try:
            v = float((self.value_field.text or '').strip())
            fu = self.from_sel.segments[self.from_sel.selected_index]
            tu = self.to_sel.segments[self.to_sel.selected_index]
            r = convert_radioactivity(v, fu, tu)
            self.conv_result.text = f'{v:g} {fu} = {r:.4g} {tu}'
        except Exception:
            self.conv_result.text = ''

if __name__ == '__main__':
    app = App()
    app.frame = (0, 0, 390, 844)
    app.present('sheet')
