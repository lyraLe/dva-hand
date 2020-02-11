### 使用create-react-app创建一个react项目
`npx create-react-app dva`

### 删除多余的文件
- 删除src文件夹下除index.js之外的文件
- 清空index.js的内容

### 在src文件夹下新建一个dva文件夹
- 新建一个index.js文件存储dva核心代码逻辑
- 新建一个router.js文件导出react-dom-router的内容

### 源码解析
- dva()本身是个函数；返回一个app对象
- app的方法：model,router,start
- dva(options) 可以设置配置项
   1. history
   2. initialState
   3. onError
   4. onAction
   5. onReducer
   6. onStateChange
   7. extraEnhancers
   8. extraReducers
   9. onEffect
   10. onHmr
- app.use(plugin)用于插件注册；即配置项添加属性

### dva本质
dva = react+redux+redux-saga+connected-react-router
