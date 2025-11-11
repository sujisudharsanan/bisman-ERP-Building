package main

import "github.com/mattermost/mattermost/server/public/plugin"

// main is the entrypoint for the Mattermost plugin server process.
// It registers our full-featured Plugin implementation.
func main() {
	plugin.ClientMain(&Plugin{})
}
