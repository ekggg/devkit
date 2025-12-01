EKG.registerWidget({
  name: 'TestWidget',

  initialState: (_ctx) => null,

  handleEvent(event, state, _ctx) {
    event.type !== 'TICK' && console.log(event)
    return state
  },
})
