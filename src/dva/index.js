import React from 'react';
import ReactDOM from 'react-dom';
import { createHashHistory } from 'history';
import { Provider, connect } from 'react-redux'
import { combineReducers, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import * as sagaEffects from 'redux-saga/effects';
import { 
  connectRouter, //方法，将router作为状态存入仓库
  ConnectedRouter,// 组件； 
  routerMiddleware
} from 'connected-react-router';
export {connect};

export default function(options={}) {
  const app = {
    _store: null,
    model,
    _models: [],// 存储所有的model
    router,
    _router: null, // 存储路由配置
    start
  }

  function model(model) {
    app._models.push(model);
  }
  function router(routerConfig) {
    app._router = routerConfig;
  }
  app.use = function(plugin) {
    options = {...options, ...plugin};
  }
  function start(container) {
    const rootElement = document.querySelector(container);

    const history = options.history || createHashHistory();
    let reducers = {
      router: connectRouter(history) // 将pathname存入状态库
    };
    if (options.extraReducers) {
      reducers = {...reducers, ...options.extraReducers}
    }

    for(let i=0; i<app._models.length; i++) {
      const model = app._models[i];
      reducers[model.namespace] = function(state=model.state, action) {
        const actionType = action.type;
        let [namespace, type] = actionType.split('/');
        if (typeof type === 'undefined') {
          type = namespace;
          namespace = model.namespace;
        }
        if (model.namespace === namespace) {
          const reducer = model.reducers[type];
          if (reducer) {
            return reducer(state, action);            
          }
        }
        return state;
      }
    }
    const rootReducer = combineReducers(reducers);
    let finalReducer = function(state, action) {
      const newState = rootReducer(state, action);
      if (options.onStateChange) {
        options.onStateChange && options.onStateChange(newState);
      }
      return newState;
    }
    if (options.onReducer) {
      finalReducer = options.onReducer(finalReducer);
    }

    const sagaMiddleware = createSagaMiddleware();
    if (options.onAction) {
      if (typeof options.onAction === 'function') {// 说明是单个
        options.onAction = [options.onAction];
      }
    } else {// 如果没有该配置项
      options.onAction = [];
    }
    // if (options.extraEnhancers) {
    //   createStore ;
    // }
    const store = createStore(finalReducer, options.initialState || {}, applyMiddleware(
      routerMiddleware(history), 
      sagaMiddleware,
      ...options.onAction
    ));
    app._store = store;

    function *rootSaga() {
      const { takeEvery } = sagaEffects;
      for(let model of app._models) {
        const subscriptions = model.subscriptions;
        for(const key in subscriptions) {
          subscriptions[key]({history, dispatch: store.dispatch});
        }
        const effects = model.effects;
        for(let key in effects) {
          // 监听每一次dispatch, 执行对应的saga
          yield takeEvery(`${model.namespace}/${key}`, function* (action) {
            try {
              let effect = effects[key]; 
              if (options.onEffect) {
                effect = options.onEffect(effect, sagaEffects, model, action.type);
              }
              yield effect(action, sagaEffects);              
            } catch(err) {
              options.onError && options.onError(err);
            }
          });
        }
      }
    }
    sagaMiddleware.run(rootSaga);

    const Applications = app._router({history});
    ReactDOM.render(
      <Provider store={store}>
        <ConnectedRouter history={history}>
          {Applications}
        </ConnectedRouter> 
      </Provider>, rootElement
    )
  }
  return app;
}