// Minimal webapp component for Mattermost plugin
// This is required even though our bot is server-only

export default class Plugin {
    initialize() {
        // No client-side functionality needed
        // Bot operates entirely server-side
    }

    uninitialize() {
        // Cleanup if needed
    }
}
