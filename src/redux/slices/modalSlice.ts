import { createSlice } from '@reduxjs/toolkit';

interface ModalState {
  modalAbierto: boolean;
}

const initialState: ModalState = {
  modalAbierto: false,
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    abrirModal: (state) => {
      state.modalAbierto = true;
    },
    cerrarModal: (state) => {
      state.modalAbierto = false;
    },
  },
});

export const { abrirModal, cerrarModal } = modalSlice.actions;
export default modalSlice.reducer;