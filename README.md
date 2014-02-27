# Track the Kraken
## The Poseidon Project

Web based application for tracking the Kraken Ocean Buoy built by The Poseidon
Project at Sutton Grammar School.

http://track.poseidon.sgsphysics.co.uk/

### Authors
 * Priyesh Patel

### Tracker Config

#### Tracker Message

The `message` key should contain a short message which will be displayed to the
user in the sidebar of the tracker. If left empty, it will be hidden.

#### Update Frequency for Tracker

The `transmission_frequency` key should contain the duration, in minutes,
between transmissions from Kraken. This value is pulled in by the tracker to
show the user the approximate time for the next transmission. 5 minutes is
added to this value by the tracker to take account for the time required for
the buoy to get GPS lock and transmit its location.
