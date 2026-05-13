// reducers/modalReducer.js
const initialState = {
    modalAbierto: false
  };
  
  const modalReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'ABRIR_MODAL':
        return {
          ...state,
          modalAbierto: true
        };
      case 'CERRAR_MODAL':
        return {
          ...state,
          modalAbierto: false
        };
      default:
        return state;
    }
  };
  
  export default modalReducer;
  