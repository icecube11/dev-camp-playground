const { Config, Container, Scenario } = require('@holochain/holochain-nodejs')
Scenario.setTape(require('tape'))
const dnaPath = "dist/bundle.json"
const dna = Config.dna(dnaPath, 'happs')
const agentAlice = Config.agent("alice")
const instanceAlice = Config.instance(agentAlice, dna)
const scenario = new Scenario([instanceAlice])

/*----------  Events  ----------*/


const testNewChannelParams = {
  name: "test new event",
  description: "for testing...",
  is_private: false,
  initial_members: []
  //public: true  // What is this doing here??
}

const testNewPrivateChannelParams = {
  name: "test new event",
  description: "for testing...",
  is_private: true,
  initial_members: []
  //public: true
}

const testMessage = {
  timestamp: 0,
  message_type: "text",
  payload: "I am the message payload",
  meta: "{}",
}


scenario.runTape('Can register a profile and retrieve', async (t, {alice}) => {
  const register_result = await alice.callSync('event', 'register', {name: 'alice', avatar_url: ''})
  console.log(register_result)
  t.true(register_result.Ok.includes('alice'))

  const get_profile_result = await alice.callSync('event', 'get_member_profile', {agent_address: register_result.Ok})
  console.log(get_profile_result)
})

scenario.runTape('Can create a public event with no other members and retrieve it', async (t, {alice}) => {
 
  const register_result = await alice.callSync('event', 'register', {name: 'alice', avatar_url: ''})
  console.log(register_result)
  t.true(register_result.Ok.includes('alice'))

  const create_result = await alice.callSync('event', 'create_event', testNewChannelParams)
  console.log(create_result)
  t.deepEqual(create_result.Ok.length, 46)

  const get_all_members_result = await alice.callSync('event', 'get_members', {event_address: create_result.Ok})
  console.log('all members:', get_all_members_result)
  let allMembers = get_all_members_result.Ok
  t.true(allMembers.length > 0, 'gets at least one member')
  
  const get_result = await alice.callSync('event', 'get_all_public_events', {})
  console.log(get_result)
  t.deepEqual(get_result.Ok.length, 1)

})

scenario.runTape('Can post a message to the event and retrieve', async (t, {alice}) => {

  const register_result = await alice.callSync('event', 'register', {name: 'alice', avatar_url: ''})
  console.log(register_result)
  t.true(register_result.Ok.includes('alice'))

  const create_result = await alice.callSync('event', 'create_event', testNewChannelParams)
  console.log(create_result)
  const event_addr = create_result.Ok
  t.deepEqual(event_addr.length, 46)

  const get_result = await alice.callSync('event', 'get_all_public_events', {})
  console.log(get_result)
  t.deepEqual(get_result.Ok.length, 1)

  const post_result = await alice.callSync('event', 'post_message', {event_address: event_addr, message: testMessage})
  console.log(post_result)
  t.notEqual(post_result.Ok, undefined, 'post should return Ok')

  const get_message_result = await alice.callSync('event', 'get_messages', {address: event_addr})
  console.log(get_message_result)
  t.deepEqual(get_message_result.Ok[0].entry.payload, testMessage.payload, 'expected to receive the message back')
})

scenario.runTape('Can create a public event with some members', async (t, {alice}) => {

  const register_result = await alice.callSync('event', 'register', {name: 'alice', avatar_url: ''})
  console.log(register_result)
  t.true(register_result.Ok.includes('alice'))

  const create_result = await alice.callSync('event', 'create_event', {...testNewChannelParams, public: false, initial_members: [register_result.Ok]})
  console.log(create_result)
  t.deepEqual(create_result.Ok.length, 46)

  const get_all_members_result = await alice.callSync('event', 'get_members', {event_address: create_result.Ok})
  console.log('all members:', get_all_members_result)
  let allMemberAddrs = get_all_members_result.Ok
  t.true(allMemberAddrs.length > 0, 'gets at least one member')
})


scenario.runTape('Can create a public event and a private event with no other members except creator', async (t, {alice}) => {

  const register_result = await alice.callSync('event', 'register', {name: 'alice', avatar_url: ''})
  console.log(register_result)
  t.true(register_result.Ok.includes('alice'))

  const create_result_private = await alice.callSync('event', 'create_event', {...testNewPrivateChannelParams, initial_members: [register_result.Ok]})
  console.log(create_result_private)
  t.deepEqual(create_result_private.Ok.length, 46)
  
  const get_all_members_result_private = await alice.callSync('event', 'get_members', {event_address: create_result_private.Ok})
  console.log('private event all members:', get_all_members_result_private)
  let allMembers_private = get_all_members_result_private.Ok
  t.true(allMembers_private.length > 0, 'gets at least one member')
  
  const create_result_public = await alice.callSync('event', 'create_event', {...testNewChannelParams, initial_members: [register_result.Ok]})
  console.log(create_result_public)
  t.deepEqual(create_result_public.Ok.length, 46)

  const get_all_members_result_public = await alice.callSync('event', 'get_members', {event_address: create_result_public.Ok})
  console.log('public event all members:', get_all_members_result_public)
  let allMembers_public = get_all_members_result_public.Ok
  t.true(allMembers_public.length > 0, 'gets at least one member')
  
  const get_result_private = await alice.callSync('event', 'get_my_private_events', {agent_address: register_result.Ok})
  console.log('private events: ', get_result_private)
  t.deepEqual(get_result_private.Ok.length, 1)
  
  const get_result_public = await alice.callSync('event', 'get_all_public_events', {})
  console.log('public events: ', get_result_public)
  t.deepEqual(get_result_public.Ok.length, 1)
  
  const get_result = await alice.callSync('event', 'get_my_public_private_events', {agent_address: register_result.Ok})
  console.log('public and private events: ', get_result)
  t.deepEqual(get_result.Ok.length, 2)
})



