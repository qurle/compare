// Enable console logging for debugging purposes
export const SHOW_LOGS = true

// Comparison settings
export const comparison = {
	// Name of the created frame
	name: 'Comparison',
	// Snapshot resolution multiplier
	scale: 2,
	// Figma rejects images larger than 4096px on either side,
	// so huge frames get a lower scale automatically
	maxImageSize: 4096,
	// Blend mode of the diff overlay fill
	overlayBlendMode: 'NORMAL' as BlendMode,
	// Snapshot fill opacities. Fills stack with normal alpha compositing,
	// so 100% under 50% gives an even 50/50 mix at full brightness
	// (two 50% fills would only reach 75% opacity)
	firstOpacity: 1,
	secondOpacity: 0.5,
	// Vertical gap between the lowest compared frame and the comparison
	gap: 32,
}

// Frame-like nodes that can be compared
export const comparableTypes: NodeType[] = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE']

// Messages for notifications when an action is successfully completed
const actionMessages = [
	'Updated',
	'Affected',
	'Fixed'
]

// Messages for notifications when no changes are needed
const idleMessages = [
	'All great, already',
	"Nothing to do",
	"Nothing changed"
]

// Entity to count and display in notifications
const entity = {
	singular: 'layer',
	plural: 'layers'
}

export const texts = {
	actionMessages, idleMessages, entity
}
