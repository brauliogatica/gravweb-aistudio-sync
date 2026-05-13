import { configureStore } from '@reduxjs/toolkit';
import modalReducer from '../slices/modalSlice';
import coordinatesReducer from '../slices/coordinatesSlice';
import projectReducer from '../reducers/projectReducer';

const store = configureStore({
  reducer: {
    // modal: modalReducer,
    // coordinates: coordinatesReducer,
    project: projectReducer,

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;