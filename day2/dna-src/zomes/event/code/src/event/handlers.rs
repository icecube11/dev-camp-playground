
use hdk::error::ZomeApiResult;
use hdk::AGENT_ADDRESS;
use hdk::holochain_core_types::{
    hash::HashString,
    entry::Entry,
    cas::content::Address,
    json::RawString,
};

use crate::event::{
    Event,
};


use crate::utils;
use crate::message;

pub fn handle_create_event(
    name: String,
    description: String,
    initial_members: Vec<Address>,
    is_private: bool
) -> ZomeApiResult<Address> {

    let event = Event{name, description, is_private};

    let event_type = if is_private { "private_event" } else { "public_event" };
    let entry = Entry::App(
        event_type.into(),
        event.into()
    );

    let event_address = hdk::commit_entry(&entry)?;
    utils::link_entries_bidir(&AGENT_ADDRESS, &event_address, "member_of", "has_member")?;
    
    for member in initial_members {
        utils::link_entries_bidir(&member, &event_address, "member_of", "has_member")?;
    }

    if is_private {
        hdk::link_entries(&AGENT_ADDRESS, &event_address, "private_event")?;
    } else {
        let anchor_entry = Entry::App(
            "anchor".into(),
            RawString::from("public_events").into(),
        );
        let anchor_address = hdk::commit_entry(&anchor_entry)?;
        hdk::link_entries(&anchor_address, &event_address, "public_event")?;
    }

    Ok(event_address)
}

// TODO: check if event is private, only allow when new joiner has already been invited by organiser
pub fn handle_join_event(event_address: HashString) -> ZomeApiResult<()> {
    utils::link_entries_bidir(&AGENT_ADDRESS, &event_address, "member_of", "has_member")?;
    Ok(())
}

pub fn handle_get_members(address: HashString) -> ZomeApiResult<Vec<Address>> {
    let all_member_ids = hdk::get_links(&address, "has_member")?.addresses().to_owned();
    Ok(all_member_ids)
}

pub fn handle_get_messages(address: HashString) -> ZomeApiResult<utils::GetLinksLoadResult<message::Message>> {
    utils::get_links_and_load_type(&address, "message_in")
}

pub fn handle_post_message(event_address: HashString, message_spec: message::MessageSpec) -> ZomeApiResult<()> {

    let message = message::Message::from_spec(
        &message_spec,
        &AGENT_ADDRESS.to_string());

    let message_entry = Entry::App(
        "message".into(),
        message.into(),
    );

    let message_addr = hdk::commit_entry(&message_entry)?;

    hdk::link_entries(&event_address, &message_addr, "message_in")?;

    Ok(())
}

pub fn handle_get_all_public_events() -> ZomeApiResult<utils::GetLinksLoadResult<Event>> {
    let anchor_entry = Entry::App(
        "anchor".into(),
        RawString::from("public_events").into(),
    );
    let anchor_address = hdk::entry_address(&anchor_entry)?;
    utils::get_links_and_load_type(&anchor_address, "public_event")
}

pub fn handle_get_my_private_events(agent_address: Address) -> ZomeApiResult<utils::GetLinksLoadResult<Event>> {
    utils::get_links_and_load_type(&agent_address, "private_event")
}

pub fn handle_get_my_public_private_events(agent_address: Address) -> ZomeApiResult<utils::GetLinksLoadResult<Event>> {
    let mut events = handle_get_my_private_events(agent_address)?;
    let public_events = handle_get_all_public_events()?;
    
    events.extend(public_events);

    Ok(events)
}
