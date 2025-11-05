const initialState = {
    token: null,
    email: null,
    loading: false,
    error: null,
    isAuthenticated: false,
  }
  
  const AuthReducer = (state = initialState, action) => {
    switch (action.type) {
      case "AUTH_REQUEST":
        return { ...state, loading: true, error: null }
  
      case "AUTH_SUCCESS":
        return {
          ...state,
          loading: false,
          token: action.payload.token,
          email: action.payload.email,
          isAuthenticated: true,
        }
  
      case "AUTH_FAIL":
        return { ...state, loading: false, error: action.payload }
  
      case "LOGOUT":
        return { ...initialState }
  
      default:
        return state
    }
  }
  
  export default AuthReducer
  