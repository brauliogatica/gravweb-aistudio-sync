// store/index.js
import { createStore } from 'redux';
import modalReducer from '../reducers/modalReducer';

const store = createStore(modalReducer);

export default store;
