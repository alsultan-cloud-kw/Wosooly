const initialState = {
  mode: 'light', // or 'dark' as default
  color: '#00bcd4', // default theme color
};

const ThemeReducer = (state = initialState, action) => {
    switch(action.type) {
        case 'SET_MODE':
            return {
                ...state,
                mode: action.payload
            }
        case 'SET_COLOR':
            return {
                ...state,
                color: action.payload
            }
        default:
            return state
    }
}

export default ThemeReducer