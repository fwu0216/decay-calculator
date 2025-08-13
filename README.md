# 放射性衰变计算器

一个基于Web的放射性衰变计算器，支持F-18和C-11同位素的衰变计算以及活度单位换算。

## 功能特性

### 衰变计算器
- 支持F-18（半衰期109.7分钟）和C-11（半衰期20.3分钟）同位素
- 初始剂量输入，支持多种单位：Bq、MBq、GBq、Ci、mCi
- 时间设置：初始时间和目标时间
- 实时计算衰变后的活度
- 显示时间差和剩余百分比
- 一键复制计算结果

### 活度单位换算器
- 支持Bq、MBq、GBq、Ci、mCi之间的相互转换
- 实时换算，即时显示结果
- 精确的转换计算

## 技术栈

- **后端**: Flask 2.3.3
- **前端**: HTML5 + CSS3 + JavaScript
- **部署**: Render平台
- **Python版本**: 3.9+

## 本地开发

### 环境要求
- Python 3.9+
- pip

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd 衰变计算器
```

2. 创建虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows
```

3. 安装依赖
```bash
pip install -r requirements.txt
```

4. 运行应用
```bash
python app.py
```

5. 访问应用
打开浏览器访问 http://localhost:5000

## 部署到Render

1. 将代码推送到GitHub仓库

2. 在Render平台创建新的Web Service

3. 连接GitHub仓库

4. 配置部署设置：
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

5. 部署应用

## 项目结构

```
衰变计算器/
├── app.py                 # Flask主应用
├── requirements.txt       # Python依赖
├── runtime.txt           # Python版本
├── .gitignore           # Git忽略文件
├── README.md            # 项目说明
├── static/              # 静态资源
│   ├── css/
│   │   └── style.css    # 样式文件
│   └── js/
│       └── main.js      # JavaScript逻辑
└── templates/           # HTML模板
    ├── base.html       # 基础模板
    └── index.html      # 主页面
```

## API接口

### 衰变计算
- **URL**: `/calculate`
- **方法**: POST
- **参数**:
  - `isotope`: 同位素 (F-18 或 C-11)
  - `a0_value`: 初始剂量数值
  - `a0_unit`: 初始剂量单位
  - `t0_time`: 初始时间
  - `tt_time`: 目标时间

### 单位换算
- **URL**: `/convert`
- **方法**: POST
- **参数**:
  - `value`: 输入数值
  - `from_unit`: 源单位
  - `to_unit`: 目标单位

### 健康检查
- **URL**: `/health`
- **方法**: GET

## 计算公式

### 衰变公式
```
A(t) = A₀ × 2^(-t/T₁/₂)
```
其中：
- A(t): 时间t后的活度
- A₀: 初始活度
- t: 时间间隔（分钟）
- T₁/₂: 半衰期（分钟）

### 单位转换因子
- Bq: 1
- MBq: 1×10⁶
- GBq: 1×10⁹
- Ci: 3.7×10¹⁰
- mCi: 3.7×10⁷

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。
