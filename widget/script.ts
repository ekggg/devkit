EKG.widget('TestWidget')
  .initialState((ctx, initial) => ({ counter: 0 }))
  .persist((state) => ({ counter: state.counter }))
  .restore((s, p) => ({ counter: p?.counter ?? s.counter }))
  .register((event, state, _ctx) => {
    event.type !== 'TICK' && console.log(event)
    return event.type === 'ekg.chat.sent' ? { counter: state.counter + 1 } : state
  })
