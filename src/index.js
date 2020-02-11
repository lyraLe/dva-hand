import React from 'react';
import dva, { connect } from './dva';
import { Router, Route, Link, routerRedux } from './dva/router';
import { createBrowserHistory } from 'history';
// import createLoading from 'dva-loading';
// import logger from 'redux-logger';

// 自定义logger中间件logger(store)
function logger({getState, dispatch}) {
  return function(dispatch) {
    return function(action) {
      console.log('====before====',getState());
      dispatch(action);
      console.log('====after====',getState());
    }
  }
}

const history = createBrowserHistory();
const app = dva({ //配置项是hookss
  history, // 默认hashRouter
  initialState: {counter: {number:5}},
  onError: (err) => { // effects错误捕获钩子
    console.log(err);
  },
  onAction: logger,//[logger], //使用中间件的钩子,可以是数组，如果单个可以不用数组
  onStateChange: (state) => {
    console.log('onStateChange');
  },
  onReducer: (reducer) => (state, action) => { // 对reducer的封装
    console.log('reducer ~ ~');
    return reducer(state, action);
  },
  // extraEnhancers: [// 丰富createStore; 结合redux-persist使用
  //   storeCreator => storeCreator
  // ]
}
); 

function delay(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve();
    },ms)
  })
}

app.model({
  namespace: 'counter',
  state: {number: 0},
  effects: {
    *asyncAdd(action, { call, put }) {
      yield call(delay, 5000);
      yield put({type: 'add', payload: 2});
    },
    *goto({ payload: { pathname }}, { call, put }) {
      yield put(routerRedux.push(pathname));
      // throw new Error('ddd'); 可以被onError钩子捕获
    }
  },
  reducers: {
    add(state, action) {
      const { payload } = action;
      return {
        number: state.number + payload
      }
    }
  },
  // 订阅
  subscriptions: {
    setup({history, dispatch}, done) {
      // 监听路由变化
      return history.listen(({pathname}) => {
      console.log('subscription');
        if (pathname === '/') {
          // dispatch({type: 'load'});
          // 抛出异常
          done(new Error('throw error'));
        }
      })
    }
  }
});
// app.use的作用：注册插件；即向dva的配置项添加配置参数（onEffect+extraReducer）
app.use(createLoading());
// 模拟dva-loading的createLoading方法
function createLoading() {
  const HIDE = 'hide';
  const SHOW = 'show';
  const initialLoadingState = {
    global: false,
    models: {},
    effects: {}
  }
  return {
    // 在effect的基础上,操作后返回一个新的saga
    onEffect: function(effect, { put }, model, actionType) {
      const { namespace } = model;
      return function* (...args) {
        yield put({type: SHOW, payload: {namespace, actionType}});
        yield effect(...args); 
        yield put({ type: HIDE, payload: { namespace, actionType}});
      }
    },
    extraReducers: {
      // 处理loading的reducer, 会在状态树上添加loading:{global,models, effects}的状态树
      loading: function(state={...initialLoadingState}, {type, payload }) {
        const { namespace, actionType } = payload || {};
        switch(type) {
          case SHOW: 
            return {
              global: true,
              models: {...state.model, [namespace]: true},
              effects: {...state.effects, [actionType]: true}
            };
          case HIDE: 
            let effects = {...state.effects, [actionType]: false};
            let modelStatus = Object.keys(effects).filter(item => item.startsWith(namespace+'/')).some(item => effects[item]);
            let models = {...state.models, [namespace]: modelStatus};
            let global = Object.keys(models).some(model => models[model]);
            return {
              global,
              effects,
              models
            }
          default:
            return state; 
        }
      }
    }
  }
}

const Home = () => <div>首页</div>
const Counter = connect(state => state.counter)(props => (
  <>
    <p>{props.number}</p>
    <button onClick={() => props.dispatch({type: 'counter/add', payload: 2})}>+</button>
    <button onClick={() => props.dispatch({type: 'counter/asyncAdd'})}>async +</button>
    <button onClick={() => props.dispatch({type: 'counter/goto', payload: {pathname: '/'}})}>
      回到首页
    </button>
  </>
))
app.router(({ history }) => (
  <Router history={history}>
    <>
      <Link to="/">首页</Link>
      <Link to="/counter">计数器</Link>
      <Route path="/" exact component={Home} />
      <Route path="/counter" component={Counter} />
    </>
  </Router>
));

app.start('#root');
