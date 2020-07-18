<template>
  <!-- NOTE: This dblclick listener is only to prevent the default dblclick zoom in Rete -->
  <div class="node-editor" @dblclick.capture.stop>
    <div class="rete" id="rete" />

    <div class="buttons-container">
      <div class="buttons-group left buttons-add-nodes">
        <v-btn fab x-small type="button" title="Add scalar" @click="addNode('Scalar')">
          <v-icon>$vuetify.icons.scalar</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Add vector" @click="addNode('Vector')">
          <v-icon>$vuetify.icons.vector</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Add matrix" @click="addNode('Matrix')">
          <v-icon>$vuetify.icons.matrix</v-icon>
        </v-btn>
        <v-menu open-on-hover :close-on-content-click="false">
          <template v-slot:activator="{ on: showMenu }">
            <v-btn fab x-small type="button" title="Add operation" v-on="showMenu">
              <v-icon>$vuetify.icons.operation</v-icon>
            </v-btn>
          </template>

          <v-list dense>
            <v-list-group>
              <template v-slot:activator>
                <v-list-item-content>
                  <v-list-item-title>Basic</v-list-item-title>
                </v-list-item-content>
              </template>
              <v-list-item v-for="nodeType in BasicOperationNodeType" :key="nodeType" @click="addNode(nodeType)">
                {{nodeType}}
              </v-list-item>
            </v-list-group>

            <v-list-group>
              <template v-slot:activator>
                <v-list-item-content>
                  <v-list-item-title>Advanced</v-list-item-title>
                </v-list-item-content>
              </template>
              <v-list-item v-for="nodeType in AdvancedOperationNodeType" :key="nodeType" @click="addNode(nodeType)" >
                {{nodeType}}
              </v-list-item>
            </v-list-group>

          </v-list>
        </v-menu>
      </div>

      <div class="buttons-group center buttons-history">
        <v-btn fab ripple x-small type="button" title="Undo" :disabled="!history.canUndo()" @click="onUndo">
          <v-icon>undo</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Redo" :disabled="!history.canRedo()" @click="onRedo">
          <v-icon>redo</v-icon>
        </v-btn>
      </div>

      <div class="buttons-group right buttons-delete-nodes">
        <v-btn fab x-small type="button" title="Recenter view" @click="recenterView">
          <v-icon>center_focus_weak</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Clear all nodes" @click="clearAllNodes">
          <v-icon>delete</v-icon>
        </v-btn>
      </div>

      <v-menu v-model="showContextMenu" :position-x="contextMenuPos.x" :position-y="contextMenuPos.y" absolute>
        <v-list dense>
          <v-list-item @click="deleteSelectedNodes">Delete</v-list-item>
        </v-list>
      </v-menu>

      <v-snackbar top color="error" timeout="-1" v-model="showingError">
        {{errorText}}
        <template v-slot:action="{ showErr }">
          <v-btn text fab small class="close-button" @click="showingError = false">
            <v-icon>close</v-icon>
          </v-btn>
        </template>
      </v-snackbar>

    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import _ from 'lodash';
import Rete from 'rete';
import type { Engine } from 'rete/types/engine';
import type { NodeEditor } from 'rete/types/editor';
import type { Node } from 'rete/types/node';
import type { Node as DataNode } from 'rete/types/core/data';
import type { NodeView } from 'rete/types/view/node';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import NodeRenderer from './NodeRenderer.vue';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'
import { EventBus } from '../EventBus';
import * as settings from '../settings';
import * as util from '../util';
import history from '../history';
import * as actions from '../history_actions';
import {
    GraphTraveler, BasicOperationNodeType, AdvancedOperationNodeType, UnaryOperationNodeType, BinaryOperationNodeType,
    ValueNodeType, NodeType, ADVANCED_RENDER_CONTROLS_KEY,
} from './node_util';
import Rect from './Rect';
import * as unary from './UnaryOperation';
import * as binary from './BinaryOperation';
import NodeFactory from './node_factory';
import vuetify from '../plugins/vuetify';

type Operation = typeof unary.UnaryOperation | typeof binary.BinaryOperation;

interface SerializedNode {
    type: string,
    data: object,
    posOffset: [number, number],
}

function getOperation(nodeName: string): Operation {
    switch (nodeName) {
    case UnaryOperationNodeType.LENGTH:         return unary.LengthOperation;
    case UnaryOperationNodeType.INVERT:         return unary.InvertOperation;
    case UnaryOperationNodeType.NORMALIZE:      return unary.NormalizeOperation;
    case UnaryOperationNodeType.TRANSPOSE:      return unary.TransposeOperation;
    case UnaryOperationNodeType.DETERMINANT:    return unary.DeterminantOperation;
    case BinaryOperationNodeType.ADD:           return binary.AddOperation;
    case BinaryOperationNodeType.SUBTRACT:      return binary.SubtractOperation;
    case BinaryOperationNodeType.MULTIPLY:      return binary.MultiplyOperation;
    case BinaryOperationNodeType.DIVIDE:        return binary.DivideOperation;
    case BinaryOperationNodeType.DOT_PRODUCT:   return binary.DotOperation;
    case BinaryOperationNodeType.CROSS_PRODUCT: return binary.CrossOperation;
    case BinaryOperationNodeType.ANGLE:         return binary.AngleOperation;
    case BinaryOperationNodeType.PROJECTION:    return binary.ProjectionOperation;
    case BinaryOperationNodeType.EXPONENT:      return binary.ExponentOperation;
    default: throw new Error(`Could not find operation "${nodeName}"`);
    }
}

// Engine updates have to happen *before* this because they set up the data we iterate over
function updateAllSockets(engine: Engine, editor: NodeEditor) {
    const graphTraveler = new GraphTraveler(engine, editor);
    graphTraveler.applyToAllNodes((engineNode, editorNode) => {
        // console.log('updateAllSockets', editorNode, engineNode, editorNode.id);
        // console.log(engineNode.inputs);
        // console.log(engineNode.outputs);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);
        if (!Object.values(ValueNodeType).includes(engineNode.name as ValueNodeType)) {
            const operation = getOperation(engineNode.name);
            if (!_.isNil(operation)) {
                _updateOperationSockets(editor, engineNode, editorNode, operation);
            }
        }
    });
}

function _updateOperationSockets(editor: NodeEditor, engineNode: DataNode, editorNode: Node, operation: Operation) {
    const inputArray = Array.from(editorNode.inputs);
    // console.log(inputArray);

    // const hasDynamicInputSockets = !_.isNil(operation.lhsToRhsTypeMap) || !_.isNil(operation.rhsToLhsTypeMap);
    // const hasDynamicOutputSocket = !_.isNil(operation.inputToOutputTypeMap);

    // TODO can probably be more efficient here
    const anyConnectionEmpty = (inputArray.some(([name, input]) => {
        // console.log(`TEST ${editorNode.name} connection empty, flagging for update`);
        return _.isEmpty(input.connections);
    }));

    const anySocketTypeMismatch = (inputArray.some(([name, input]) => {
        console.assert(input.connections.length <= 1); // Enforced by editor
        if (_.isEmpty(input.connections)) {
            return false;
        }
        const connection = input.connections[0];
        // TODO checking by socket name is overly aggressive; could instead check for type subset
        return connection.input.socket.name !== connection.output.socket.name;
    }));

    const needsUpdateFromInputs = anyConnectionEmpty || anySocketTypeMismatch;
    // console.log('TEST', editorNode.name, 'needs input update?', needsUpdateFromInputs);
    if (needsUpdateFromInputs) {
    // if (true) {
        // First, update each input socket based on its connection and based on what types the current operation allows
        operation.updateInputSocketTypes(editor, editorNode);
    }

    // Then update output socket type based on input socket types
    operation.updateOutputSocketTypes(editor, editorNode);
}

export default Vue.extend({
    name: 'NodeEditor',
    data() {
        return {
            BasicOperationNodeType,
            AdvancedOperationNodeType,

            version: 'vecviz@0.1.0', // Make sure to update this if introducing changes that would break saved node editor state
            settings: settings.nodeEditorSettings,
            history, // For checking whether to disable undo/redo buttons // TODO is it better to do this or add a computed property?

            lastNodePosition: null as [number, number] | null,
            newNodesShouldBeCentered: true,

            nodeFactory: null! as NodeFactory,
            container: null! as HTMLElement,
            editor: null! as NodeEditor,
            engine: null! as Engine,

            currentlyHandlingHistoryAction: false,
            showingAdvancedRenderControls: true,

            // TODO switch to use Rete Area Plugin?
            minZoom: 0.1,
            maxZoom: 3,

            showContextMenu: false,
            contextMenuPos: { x: 0, y: 0 },

            showingError: false,
            errorText: '',
        };
    },

    methods: {
        setUpBasicHistoryActions() {
            this.editor.on('nodecreated', node => history.add(new actions.AddNodeAction(this.editor, node)));
            this.editor.on('noderemoved', node => history.add(new actions.RemoveNodeAction(this.editor, node)));
            this.editor.on('nodetranslated', ({ node, prev }) => {
                if (_.isEqual(node.position, prev)) {
                    return;
                }
                if (history.last instanceof actions.DragNodeAction && history.last.node === node) {
                    history.last.update(node);
                } else {
                    history.add(new actions.DragNodeAction(this.editor, node, prev));
                }
            });

            this.editor.on('connectioncreated', c => history.add(new actions.AddConnectionAction(this.editor, c)));
            this.editor.on('connectionremoved', c => history.add(new actions.RemoveConnectionAction(this.editor, c)));
        },

        addAndRepositionNode(node: Node) {
            this.editor.addNode(node);
            const nodeView = this.editor.view.nodes.get(node);
            if (nodeView == null) {
                throw new Error(`Could not find view for node ${node}`);
            }

            node.position = this.getNewNodePos(node, nodeView);
            console.log('Added node at position', node.position);

            // Normally addNode triggers this update, but since I updated the position *after* adding the node, I need to do it manually
            nodeView.update();

            this.newNodesShouldBeCentered = false;
            this.lastNodePosition = [...node.position];
        },

        async addNode(nodeType: string) {
            console.log(`Add node (type ${nodeType})`);
            this.addAndRepositionNode(await this.nodeFactory.createNode(nodeType));
        },

        getNewNodePos(node: Node, nodeView: NodeView): [number, number] {
            // This could be much cleaner if JS supported operator overloading for a clean Vector interface
            const editorX = this.editor.view.area.transform.x;
            const editorY = this.editor.view.area.transform.y;
            const nodeEditorWidth = this.editor.view.container.parentElement?.parentElement?.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement?.parentElement?.clientHeight;
            if (nodeEditorWidth == null || nodeEditorHeight == null) {
                throw new Error(`Failed to find node editor width/height (${nodeEditorWidth}, ${nodeEditorHeight})`);
            }
            const editorScale = this.editor.view.area.transform.k;
            const nodeWidth = nodeView.el.offsetWidth;
            const nodeHeight = nodeView.el.offsetHeight;
            if (this.newNodesShouldBeCentered) {
                const nodeEditorCenterX = nodeEditorWidth / 2;
                const nodeEditorCenterY = nodeEditorHeight / 2;
                const desiredPosX = ((nodeEditorCenterX - editorX) / editorScale) - nodeWidth / 2;
                const desiredPosY = ((nodeEditorCenterY - editorY) / editorScale) - nodeHeight / 2;
                return [desiredPosX, desiredPosY];
            } else {
                if (this.lastNodePosition == null) {
                    throw new Error('lastNodePosition was null');
                }
                const nodeOffset = 30;
                const wrapMargin = 30;
                const editorViewRect = new Rect({
                    top: -editorY / editorScale,
                    left: -editorX / editorScale,
                    right: (nodeEditorWidth - editorX) / editorScale,
                    bottom: (nodeEditorHeight - editorY) / editorScale,
                });
                editorViewRect.grow(-wrapMargin);
                editorViewRect.right -= nodeWidth;
                editorViewRect.bottom -= nodeHeight;
                const xRelativeToView = this.lastNodePosition[0] + nodeOffset - editorViewRect.left;
                const yRelativeToView = this.lastNodePosition[1] + nodeOffset - editorViewRect.top;
                const desiredPosX = editorViewRect.left + xRelativeToView % editorViewRect.width();
                const desiredPosY = editorViewRect.top + yRelativeToView % editorViewRect.height();
                return [desiredPosX, desiredPosY];
            }
        },

        deleteSelectedNodes() {
            const lastHistoryIdx = history.length - 1;
            this.editor.selected.each(node => {
                this.editor.removeNode(node);
            });
            // Combine all resulting RemoveNodeActions and RemoveConnectionActions into a single action
            history.squashTopActionsDownToIndex(lastHistoryIdx + 1);
        },

        onUndo() {
            console.log('UNDO');
            try {
                history.disable();
                history.undo();
                // HACK: Disable new history items from being added for the whole tick; the default behavior only disables it
                //       while undo() is on the call stack, but since we may add new history items via watchers, the history
                //       will be re-enabled by that point
                // TODO: Does that just mean that I should not use watchers with fields that could trigger history?
                this.$nextTick(() => {
                    history.enable();
                });
            } catch (error) {
                console.warn('caught error in undo event', error);
            }
        },

        onRedo() {
            console.log('REDO');
            history.redo();
            // this.currentlyHandlingHistoryAction = true;
            // this.editor.trigger('redo');
            // this.$nextTick(() => {
            //     this.currentlyHandlingHistoryAction = false;
            // });
        },

        serializeNode(node: Node, originPos: [number, number]): SerializedNode {
            return {
                type: node.name,
                data: node.data,
                posOffset: [node.position[0] - originPos[0], node.position[1] - originPos[1]],
            };
        },

        onCut(event: ClipboardEvent) {
            console.log('NodeEditor.onCut', event);
            if (event.clipboardData == null) {
                throw new Error('Clipboard data was null');
            }
            this.onCopy(event);
            this.deleteSelectedNodes();
        },

        onCopy(event: ClipboardEvent) {
            console.log('NodeEditor.onCopy', event, this.editor.selected);
            if (event.clipboardData == null) {
                throw new Error('Clipboard data was null');
            }
            if (this.editor.selected.list.length) {
                const originPos = this.editor.selected.list[0].position; // TODO I think best would be to find the node closest to center of selected
                event.clipboardData.setData('application/json', JSON.stringify(this.editor.selected.list.map(node => {
                    return this.serializeNode(node, originPos);
                })));
            }
        },

        async onPaste(event: ClipboardEvent) {
            console.log('NodeEditor.onPaste', event);
            if (event.clipboardData == null) {
                throw new Error('Clipboard data was null');
            }
            const nodes = JSON.parse(event.clipboardData.getData('application/json'));
            console.log(nodes);
            let rootPosition = null;
            // TODO these need to be a single history action
            for (const nodeDescription of nodes) {
                const node = await this.nodeFactory.createNode(nodeDescription.type);
                node.data = nodeDescription.data;
                // console.log('PASTING', nodeDescription, node);
                if (!rootPosition) { // TODO currently assuming that the first node is the one that was used for origin pos
                    // Use the standard node positioning logic for the "root" of the pasted nodes
                    console.assert(_.isEqual(nodeDescription.posOffset, [0, 0]));
                    this.addAndRepositionNode(node);
                    rootPosition = node.position;
                } else {
                    // For all of the remaining nodes, position them relative to the root node
                    node.position = [rootPosition[0] + nodeDescription.posOffset[0], rootPosition[1] + nodeDescription.posOffset[1]];
                    this.editor.addNode(node);
                }
            }
        },

        recenterView() {
            let viewRect = null;
            for (const [node, nodeView] of this.editor.view.nodes) {
                // These values are in editor space, not screen space
                const nodeRect = new Rect({
                    top: node.position[1],
                    left: node.position[0],
                    right: node.position[0] + nodeView.el.offsetWidth,
                    bottom: node.position[1] + nodeView.el.offsetHeight,
                });
                if (viewRect) {
                    viewRect = viewRect.union(nodeRect);
                } else {
                    viewRect = nodeRect;
                }
            }
            if (viewRect === null) {
                return;
            }
            const padding = 30;
            viewRect.grow(padding);

            const [editorMidpointX, editorMidpointY] = viewRect.midpoint(); // In editor space, not screen space
            const nodeEditorWidth = this.editor.view.container.parentElement?.parentElement?.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement?.parentElement?.clientHeight;
            if (nodeEditorWidth == null || nodeEditorHeight == null) {
                throw new Error(`Failed to find node editor width/height (${nodeEditorWidth}, ${nodeEditorHeight})`);
            }
            const widthRatio = nodeEditorWidth / viewRect.width();
            const heightRatio = nodeEditorHeight / viewRect.height();
            const scale = util.clamp(Math.min(widthRatio, heightRatio), this.minZoom, this.maxZoom); // Determine how far we should zoom in/out to fit everything

            // x/y here is in screen space
            this.editor.view.area.transform = {
                k: scale,
                x: (nodeEditorWidth / 2) - (editorMidpointX * scale),
                y: (nodeEditorHeight / 2) - (editorMidpointY * scale),
            };
            console.log('recenterView set view transform to:', this.editor.view.area.transform);
            this.editor.view.area.update();
        },

        clearAllNodes() {
            console.log('clearAllNodes');
            if (window.confirm('Are you sure you want to clear all nodes?')) {
                const clearAllNodesAction = new actions.MultiAction([
                    new actions.RemoveAllConnectionsAction(this.editor),
                    new actions.RemoveAllNodesAction(this.editor),
                    new actions.FieldChangeAction(this.editor.view.area.transform, { k: 1, x: 0, y: 0 }, val => {
                        this.editor.view.area.transform = val;
                        this.editor.view.area.update();
                    }),
                ]);
                history.addAndDo(clearAllNodesAction);
            }
        },

        async loadNodes(): Promise<void> {
            // const savedEditorJson = null;
            const savedEditorJson = window.localStorage.getItem('node_editor');

            if (savedEditorJson) {
                console.log('LOADING:', savedEditorJson);
                const success = await this.editor.fromJSON(JSON.parse(savedEditorJson));
                console.log('LOADED:', this.editor);
                if (!success) {
                    console.log('Could not load from local storage, creating demo nodes instead');
                    await this.createDemoNodes();
                }
            } else {
                console.log('Creating demo nodes');
                await this.createDemoNodes();
            }
        },

        async createDemoNodes(): Promise<void> {
            const [vecLhs, vecRhs, add, vecSum, length, scalarLen] = await Promise.all([
                this.nodeFactory.createNode(NodeType.VECTOR, {
                    'value': [3, 2, 0],
                    [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
                    'color': { color: '#00ffff', visible: true },
                    'display_title': 'Vector 1',
                }),
                this.nodeFactory.createNode(NodeType.VECTOR, {
                    'value': [-1, 2, 0],
                    [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
                    'color': { color: '#00ffff', visible: true },
                    'display_title': 'Vector 2',
                }),
                this.nodeFactory.createNode(NodeType.ADD),
                this.nodeFactory.createNode(NodeType.VECTOR, {
                    [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
                    'color': { color: this.settings.values.defaultVectorColor, visible: true },
                    'display_title': 'Sum',
                }),
                this.nodeFactory.createNode(NodeType.LENGTH),
                this.nodeFactory.createNode(NodeType.SCALAR, {
                    'value': [0],
                    [ADVANCED_RENDER_CONTROLS_KEY]: [0, 0, 0],
                    'color': { color: this.settings.values.defaultScalarColor, visible: true },
                    'display_title': 'Output',
                }),
            ]);
            vecLhs.position = [30, 80];
            vecRhs.position = [30, 240];
            add.position = [320, 150];
            vecSum.position = [490, 70];
            length.position = [550, 250];
            scalarLen.position = [740, 250];

            this.editor.addNode(vecLhs);
            this.editor.addNode(vecRhs);
            this.editor.addNode(add);
            this.editor.addNode(vecSum);
            this.editor.addNode(length);
            this.editor.addNode(scalarLen);

            this.editor.connect(vecLhs.outputs.get('value')!, add.inputs.get('lhs')!);
            this.editor.connect(vecRhs.outputs.get('value')!, add.inputs.get('rhs')!);
            this.editor.connect(add.outputs.get('result')!, vecSum.inputs.get('value')!);
            this.editor.connect(vecSum.outputs.get('value')!, length.inputs.get('input')!);
            this.editor.connect(length.outputs.get('output')!, scalarLen.inputs.get('value')!);
        },

        saveState() {
            console.log('Saving editor state to browser-local storage', this.editor.toJSON());
            window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));
            window.localStorage.setItem('node_editor_view_transform', JSON.stringify(this.editor.view.area.transform));
        },

        async loadState(): Promise<void> {
            console.log('Loading node editor from local storage');

            const viewTransform = window.localStorage.getItem('node_editor_view_transform');
            if (viewTransform) {
                this.editor.view.area.transform = JSON.parse(viewTransform);
                this.editor.view.area.update();
            }

            await this.loadNodes();
        },

        postLoad() {
            // Do not set up undo/redo callbacks until after finished loading to prevent user from undoing load
            this.setUpBasicHistoryActions();

            document.addEventListener('keydown', e => {
                if (!e.ctrlKey) return;

                switch (e.code) {
                case 'KeyZ':
                    if (e.shiftKey) {
                        history.redo();
                    } else {
                        history.undo();
                    }
                    break;
                case 'KeyY':
                    history.redo();
                    break;
                default: break;
                }
            });

            this.editor.on('zoom', ({transform, zoom, source}) => {
                return (this.minZoom <= zoom && zoom <= this.maxZoom);
            });

            this.editor.on(['translated', 'zoomed'], () => {
                this.newNodesShouldBeCentered = true;
            });

            this.editor.on('connectionpick', io => {
                const isOutput = io instanceof Rete.Output;
                if (io.node == null) {
                    throw new Error('IO had no associated node');
                }
                const disabled = io.node.data['disabled'] || false;
                return !(isOutput && disabled);
            });

            this.engine.on('error', this.handleReteError);
            this.editor.on('error', this.handleReteError);

            this.engine.on('warn', (exc: string | Error) => {
                console.warn('Warning from Rete engine:', exc);
            });
        },

        // HACK: 'error' type declared as "string | Error", but that does not match the source code.  'any' is a workaround.
        handleReteError({message, data}: any) {
            const nodeDesc = (() => {
                const displayName = data?.data?.display_title;
                const defaultName = data?.name;
                const name = displayName || defaultName;
                return name ? ` in node "${name}"` : '';
            })();
            const msg = `Error${nodeDesc}: ${message}`;
            console.error(msg);
            this.errorText = msg;
            this.showingError = true;
        },

        async triggerEngineProcess(): Promise<boolean> {
            console.log('NodeEditor triggerEngineProcess', this.editor.toJSON());

            this.showingError = false;

            // Make sure both promises get scheduled next to each other, so there is no chance for another 'process' to get
            // ordered after the 'abort' below (which can happen if there are multiple 'triggerEngineProcess'es scheduled
            // and we 'await' the below functions individually)
            // This prevents warning logs from Rete.
            const [_, status] = await Promise.all([
                this.engine.abort(), // Stop old job if running
                this.engine.process(this.editor.toJSON()),
            ]);

            if (status === 'success') {
                this.saveState();

                EventBus.$emit('node_engine_processed', this.editor.toJSON());
                return true;
            } else if (status === 'aborted' || status === undefined) {
                return false;
            } else {
                throw new Error(`Unexpected result from Rete.Engine.process: ${status}`);
            }
        },

        async handleConnectionChanged() {
            console.log('NodeEditor handleConnectionChanged');
            // Engine updates must come first because it effects the node data that we iterate over
            if (await this.triggerEngineProcess()) {
                updateAllSockets(this.engine, this.editor);
            }
        },

        addOrRemoveAdvancedControls(add: boolean) {
            console.log('adding or removing advanced render controls', add);
            const actionStack = [];
            const graphTraveler = new GraphTraveler(this.engine, this.editor);
            graphTraveler.applyToAllNodes((engineNode, editorNode) => {
                if (editorNode.inputs.has(ADVANCED_RENDER_CONTROLS_KEY)) {
                    console.log('NodeEditor advanced render controls handler', engineNode, editorNode);
                    if (add) {
                        const renderControlsAction = new actions.AddAdvancedRenderControlsAction(this.editor, editorNode, ADVANCED_RENDER_CONTROLS_KEY);
                        actionStack.push(renderControlsAction);
                    } else {
                        // Reset origin
                        // TODO probably should be bundled in with RemoveAdvancedRenderControlsAction, but it is convenient to
                        //      use FieldChangeAction (which I could still do inside of RemoveAdvancedRenderControlsAction)
                        const resetOriginAction = new actions.FieldChangeAction(engineNode.data[ADVANCED_RENDER_CONTROLS_KEY], [0, 0, 0], val => {
                            engineNode.data[ADVANCED_RENDER_CONTROLS_KEY] = val;
                            // Make sure changes are processed
                            this.editor.trigger('process'); // TODO I could maybe go through vue component to make sure this happens automatically
                        });
                        actionStack.push(resetOriginAction);

                        // console.log('Pushing RemoveAdvancedRenderControlsAction', this.editor, engineNode);
                        const renderControlsAction = new actions.RemoveAdvancedRenderControlsAction(this.editor, editorNode, ADVANCED_RENDER_CONTROLS_KEY);
                        actionStack.push(renderControlsAction);
                    }
                }
            });

            const updateSettingAction = new actions.FieldChangeAction(!add, add, val => {
                // console.log('saving settings from NodeEditor field change', val);
                this.settings.update('showAdvancedRenderSettings', val);
                this.$nextTick(() => { // Fix connection paths - do next tick to give newly added connections time to be added to the DOM
                    for (const connectionView of this.editor.view.connections.values()) {
                        connectionView.update();
                    }
                });
            });
            actionStack.push(updateSettingAction);

            history.addAndDo(new actions.MultiAction(actionStack));
        },
    },

    mounted() {
        console.log('NodeEditor mounted', this.editor, this.engine);

        this.nodeFactory = new NodeFactory();

        this.container = document.getElementById('rete')!;
        if (this.container == null) {
            throw new Error('No container element with id "rete"?');
        }
        this.editor = new Rete.NodeEditor(this.version, this.container);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin, {
            options: {
                vuetify,
            },
            component: NodeRenderer,
        });
        console.log('NodeEditor mounted, plugins list:', this.editor.plugins);
        console.log('NodeEditor mounted, events:', this.editor.events);
        // console.log('NodeEditor mounted, connectionremoved:', this.editor.events['connectionremoved']);
        // console.log('NodeEditor mounted, connectionremoved handlers:', this.editor.events['connectionremoved'].handlers);

        this.engine = new Rete.Engine(this.version);

        EventBus.$on('save', () => {
            this.saveState();
        });

        EventBus.$on('split-resized', () => {
            this.editor.view.resize();
        });

        EventBus.$on('show-advanced-controls-toggled', (val: boolean) => {
            this.addOrRemoveAdvancedControls(val);
        });

        Object.values(this.nodeFactory.components).map(component => {
            this.editor.register(component);
            this.engine.register(component);
        });

        this.editor.on('nodecreated', node => {
            // TODO why am I doing this to every node instead of only the one that was just created?
            Array.prototype.map.call(document.getElementsByClassName('node'), nodeView => {
                nodeView.addEventListener('contextmenu', (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.contextMenuPos = { x: event.clientX, y: event.clientY };
                    this.showContextMenu = true;
                });
            });
        });

        (async () => {
            await this.loadState();

            this.postLoad();

            // Do not trigger any of these events until after the initial load is done
            // TODO still not perfect, does not prevent multiple changes from user getting queued up; is there something like Javas 'synchronized' keyword?
            this.editor.on(['process', 'nodecreated', 'noderemoved'], this.triggerEngineProcess);
            // TODO handleConnectionChanged also does this, so no need to do it twice
            await this.triggerEngineProcess(); // Process at least once to make sure the viewports are updated

            this.editor.on(['connectioncreated', 'connectionremoved'], this.handleConnectionChanged);
            this.handleConnectionChanged(); // Run once to set up socket types
        })();

        // Using body for these because that will be the active element after a node has been selected (not sure if that is necessary?)
        document.body.addEventListener('keydown', event => {
            if (event.key === 'Delete' && this.editor.selected.list.length) {
                this.deleteSelectedNodes();
                event.preventDefault();
            }
        });

        document.body.addEventListener('cut', event => {
            this.onCut(event);
            event.preventDefault();
        });
        document.body.addEventListener('copy', event => {
            this.onCopy(event);
            event.preventDefault();
        });
        document.body.addEventListener('paste', event => {
            this.onPaste(event);
            event.preventDefault();
        });

        this.editor.view.resize();
        this.editor.trigger('process');

        this.$nextTick(() => {
            // For some reason the initial render has a scroll bar, so need to force resize again to take up whole container
            this.editor.view.resize();
        });
    },
});
</script>

<style lang="sass" scoped>
.node-editor
  height: 100% // Make sure container is large enough when split is fully expanded
  position: relative
  display: block
  width: 100%
  min-height: 100px
  overflow-y: hidden
  .buttons-container
    pointer-events: none
    .buttons-group
      display: inline-block
      width: 33%
      &:first-child
        margin-left: 8px
      &.left
        text-align: left
      &.center
        text-align: center
      &.right
        text-align: right
    button.v-btn
      pointer-events: auto
      // &:first-of-type
      //   margin-left: 8px
      margin-right: 8px
      .v-icon
        // For my custom icons
        height: 24px
        width: 24px
        // For builtin icons
        font-size: 24px
    position: absolute
    left: 5px
    top: 12px
    right: 5px
.rete
  display: block
  height: 100%
  min-height: 100vh
  border: 2px solid #616161
.split
  overflow-y: hidden
.v-application.theme--light
  .v-icon
    opacity: 0.6 // TODO Changing the color isn't working, but this does
  .rete
    background-color: #bbbbbb
.v-application.theme--dark
  .v-icon
    fill: white
  .rete
    background-color: #424242
#app .close-button
  margin-right: 0
</style>
