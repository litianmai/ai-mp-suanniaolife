Page({
  data: {
    userInfo: {
      nickname: '小鱼',
      userId: '1048972725',
      follows: 36,
      fans: 1,
      likes: 0
    },
    activeTab: 'note',
    showModal: false
  },

  onLoad() {
    // 加载用户信息
  },

  // 编辑资料
  onEditProfile() {
    console.log('编辑资料');
  },

  // 进入设置
  onSettings() {
    console.log('进入设置');
  },

  // 切换标签页
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 点击去发布
  onPublish() {
    this.setData({ showModal: true });
  },

  // 关闭提示横幅
  onCloseNotice() {
    // 关闭横幅逻辑
  },

  // 取消跳转
  onCancel() {
    this.setData({ showModal: false });
  },

  // 确认跳转
  onConfirm() {
    this.setData({ showModal: false });
    // 复制百度搜索链接到剪贴板
    wx.setClipboardData({
      data: 'https://www.baidu.com',
      success: () => {
        wx.showModal({
          title: '提示',
          content: '已复制百度搜索链接，请在浏览器中打开',
          showCancel: false
        });
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: '无法打开链接，已复制网址到剪贴板',
          showCancel: false
        });
      }
    });
  },

  // 底部导航切换
  onTabBarChange(e) {
    const index = e.currentTarget.dataset.index;
    const pages = ['首页', '市集', '发布', '消息', '我'];
    console.log('切换到:', pages[index]);
  }
});
