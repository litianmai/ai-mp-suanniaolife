Page({
  data: {
    expression: '',
    result: '0',
    currentNum: '0',
    lastOp: null,
    isNewNum: true
  },

  // 输入数字
  handleNumber(e) {
    const num = e.currentTarget.dataset.num;
    let { currentNum, isNewNum } = this.data;

    if (isNewNum) {
      currentNum = num;
      isNewNum = false;
    } else {
      currentNum = currentNum === '0' ? num : currentNum + num;
    }

    // 限制数字长度
    if (currentNum.length > 12) {
      return;
    }

    this.setData({
      currentNum,
      isNewNum,
      result: currentNum
    });
  },

  // 输入小数点
  handleDot() {
    let { currentNum, isNewNum } = this.data;

    if (isNewNum) {
      currentNum = '0.';
      isNewNum = false;
    } else if (!currentNum.includes('.')) {
      currentNum += '.';
    }

    this.setData({
      currentNum,
      isNewNum,
      result: currentNum
    });
  },

  // 清除
  handleClear() {
    this.setData({
      expression: '',
      result: '0',
      currentNum: '0',
      lastOp: null,
      isNewNum: true
    });
  },

  // 正负号切换
  handleToggleSign() {
    let { currentNum } = this.data;

    if (currentNum.startsWith('-')) {
      currentNum = currentNum.slice(1);
    } else if (currentNum !== '0') {
      currentNum = '-' + currentNum;
    }

    this.setData({
      currentNum,
      result: currentNum
    });
  },

  // 百分号
  handlePercent() {
    let { currentNum } = this.data;
    const num = parseFloat(currentNum) / 100;
    currentNum = this.formatResult(num);

    this.setData({
      currentNum,
      result: currentNum,
      isNewNum: true
    });
  },

  // 运算符
  handleOperator(e) {
    const op = e.currentTarget.dataset.op;
    let { expression, currentNum, lastOp } = this.data;

    if (lastOp && !this.data.isNewNum) {
      // 执行之前的运算
      const result = this.calculate(expression, currentNum, lastOp);
      expression = result;
      currentNum = result;
    } else {
      expression = currentNum;
    }

    this.setData({
      expression: expression + ' ' + this.getOpSymbol(op),
      lastOp: op,
      isNewNum: true
    });
  },

  // 等于
  handleEquals() {
    let { expression, currentNum, lastOp } = this.data;

    if (!lastOp) {
      return;
    }

    const result = this.calculate(expression, currentNum, lastOp);

    this.setData({
      expression: '',
      result: result,
      currentNum: result,
      lastOp: null,
      isNewNum: true
    });
  },

  // 计算
  calculate(a, b, op) {
    const num1 = parseFloat(a);
    const num2 = parseFloat(b);
    let result = 0;

    switch (op) {
      case '+':
        result = num1 + num2;
        break;
      case '-':
        result = num1 - num2;
        break;
      case '*':
        result = num1 * num2;
        break;
      case '/':
        if (num2 === 0) {
          return '错误';
        }
        result = num1 / num2;
        break;
    }

    return this.formatResult(result);
  },

  // 格式化结果
  formatResult(num) {
    if (typeof num === 'string') {
      return num;
    }
    // 处理精度问题
    const str = num.toFixed(8);
    // 去除末尾的 0
    return parseFloat(str).toString();
  },

  // 获取运算符显示符号
  getOpSymbol(op) {
    const symbols = {
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷'
    };
    return symbols[op] || op;
  }
})
