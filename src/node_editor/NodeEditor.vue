<template>
  <!-- NOTE: This dblclick listener is only to prevent the default dblclick zoom in Rete -->
  <div class="node-editor" @dblclick.capture.stop>
    <div class="rete" id="rete" />

    <!-- TODO this container swallows clicks -->
    <div class="buttons-container">
      <div class="buttons-group buttons-add-nodes">
        <!-- <v-btn x-small type="button" title="test1" @click="test1">test1</v-btn> -->
        <!-- <v-btn x-small type="button" title="test2" @click="test2">test2</v-btn> -->
        <v-btn fab x-small type="button" title="Add scalar" @click="addNode('scalar')">
          <v-icon>$vuetify.icons.scalar</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Add vector" @click="addNode('vector')">
          <v-icon>$vuetify.icons.vector</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Add matrix" @click="addNode('matrix')">
          <v-icon>$vuetify.icons.matrix</v-icon>
        </v-btn>
        <!-- TODO dosen't seem to support a "dense" mode like md-select does -->
        <v-menu>
          <!-- TODO I think I'm going to want to split operations into categories: maybe 'basic', 'matrix', 'trig'? -->
          <template v-slot:activator="{ on: showMenu }">
            <v-btn fab x-small type="button" title="Add unary operation" v-on="showMenu">
              <v-icon>$vuetify.icons.operation</v-icon>
            </v-btn>
          </template>

          <v-list dense>
            <v-list-item @click="addNode('operation-length')">Length</v-list-item>
            <v-list-item @click="addNode('operation-invert')">Invert</v-list-item>
            <v-list-item @click="addNode('operation-normalize')">Normalize</v-list-item>
            <v-list-item @click="addNode('operation-transpose')">Transpose</v-list-item>
            <v-list-item @click="addNode('operation-determinant')">Determinant</v-list-item>
          </v-list>
        </v-menu>
        <v-menu>
          <!-- TODO I think I'm going to want to split operations into categories: maybe 'basic', 'matrix', 'trig'? -->
          <template v-slot:activator="{ on: showMenu }">
            <v-btn fab x-small type="button" title="Add binary operation" v-on="showMenu">
              <v-icon>$vuetify.icons.operation</v-icon>
            </v-btn>
          </template>

          <v-list dense>
            <v-list-item @click="addNode('operation-add')">Add</v-list-item>
            <v-list-item @click="addNode('operation-subtract')">Subtract</v-list-item>
            <v-list-item @click="addNode('operation-multiply')">Multiply</v-list-item>
            <v-list-item @click="addNode('operation-divide')">Divide</v-list-item>
            <v-list-item @click="addNode('operation-dot')">Dot Product</v-list-item>
            <v-list-item @click="addNode('operation-cross')">Cross Product</v-list-item>
            <v-list-item @click="addNode('operation-angle')">Angle</v-list-item>
            <v-list-item @click="addNode('operation-projection')">Projection</v-list-item>
            <v-list-item @click="addNode('operation-exponent')">Exponent</v-list-item>
          </v-list>
        </v-menu>
      </div>

      <span class="buttons-group buttons-spacer" />

      <div class="buttons-group buttons-history">
        <v-btn fab ripple x-small type="button" title="Undo" :disabled="!history.canUndo()" @click="onUndo">
          <!-- TODO color not working -->
          <v-icon>undo</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Redo" :disabled="!history.canRedo()" @click="onRedo">
          <v-icon>redo</v-icon>
        </v-btn>
      </div>

      <span class="buttons-group buttons-spacer" />

      <div class="buttons-group buttons-delete-nodes">
        <v-btn fab x-small type="button" title="Recenter view" @click="recenterView">
          <v-icon>center_focus_weak</v-icon>
        </v-btn>
        <v-btn fab x-small type="button" title="Clear all nodes" @click="clearAllNodes">
          <v-icon>delete</v-icon>
        </v-btn>
      </div>

      <v-menu v-model="showContextMenu" :position-x="contextMenuPos.x" :position-y="contextMenuPos.y" absolute>
        <v-list dense>
          <v-list-item @click="deleteNode">Delete</v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import allComponents from './components';
// import { Engine, ComponentWorker } from 'rete/build/rete-engine.min'
import { EventBus } from '../EventBus';
import settings from '../settings';
import util from '../util';
import history from '../history';
import actions from '../history_actions';
import { GraphTraveler, ValueType } from './node_util';
import Rect from './Rect';
import UnaryOperation from './UnaryOperation';
import BinaryOperation from './BinaryOperation';

// TODO kind of a hack, would it be better to use name as the key everywhere, or maybe assign extra data to each node?
function getOperation(nodeName) {
    switch (nodeName) {
    case 'Length':        return UnaryOperation.LENGTH;
    case 'Invert':        return UnaryOperation.INVERT;
    case 'Normalize':     return UnaryOperation.NORMALIZE;
    case 'Transpose':     return UnaryOperation.TRANSPOSE;
    case 'Determinant':   return UnaryOperation.DETERMINANT;
    case 'Add':           return BinaryOperation.ADD;
    case 'Subtract':      return BinaryOperation.SUBTRACT;
    case 'Multiply':      return BinaryOperation.MULTIPLY;
    case 'Divide':        return BinaryOperation.DIVIDE;
    case 'Dot Product':   return BinaryOperation.DOT_PRODUCT;
    case 'Cross Product': return BinaryOperation.CROSS_PRODUCT;
    case 'Angle':         return BinaryOperation.ANGLE;
    case 'Projection':    return BinaryOperation.PROJECTION;
    case 'Exponent':      return BinaryOperation.EXPONENT;
    }
}

// Engine updates have to happen *before* this because they set up the data we iterate over
function updateAllSockets(engine, editor) {
    const graphTraveler = new GraphTraveler(engine, editor);
    graphTraveler.applyToAllNodes((engineNode, editorNode) => {
        // console.log('updateAllSockets', editorNode, engineNode);
        // console.log(inputs);
        // console.log(outputs);
        // console.log(editorNode.inputs);
        // console.log(editorNode.outputs);
        const operation = getOperation(engineNode.name);
        if (!_.isNil(operation)) {
            _updateOperationSockets(editor, engineNode, editorNode, operation);
        }
    });
}

function _updateOperationSockets(editor, engineNode, editorNode, operation) {
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
        // TODO doesn't account for compatible sockets with different names, though I am not using those yet outside of 'Anything' sockets
        // TODO checking by socket name is overlay aggressive; could instead check for type subset
        return connection.input.socket.name !== connection.output.socket.name;
    }));

    // const needsUpdate = hasDynamicInputSockets && (anyConnectionEmpty || anySocketTypeMismatch); // TODO dynamic also could just mean that the socket can go from 'anything' to input type
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

export default {
    name: 'NodeEditor',
    data() {
        return {
            version: 'vecviz@0.1.0', // Make sure to update this if introducing changes that would break saved node editor state
            settings: settings.nodeEditorSettings,
            history: history, // For checking whether to disable undo/redo buttons // TODO is it better to do this or add a computed property?

            lastNodePosition: null,
            newNodesShouldBeCentered: true,

            container: null,
            editor: null,
            engine: null,

            currentlyHandlingHistoryAction: false,
            showingAdvancedRenderControls: true,

            // TODO switch to use Rete Area Plugin?
            minZoom: 0.1,
            maxZoom: 3,

            showContextMenu: false,
            contextMenuPos: { x: 0, y: 0 },

            components: {
                'scalar':                new allComponents.ValueComponent(this.$vuetify, ValueType.SCALAR),
                'vector':                new allComponents.ValueComponent(this.$vuetify, ValueType.VECTOR),
                'matrix':                new allComponents.ValueComponent(this.$vuetify, ValueType.MATRIX),

                'operation-length':      new allComponents.UnaryOperationComponent(UnaryOperation.LENGTH),
                'operation-invert':      new allComponents.UnaryOperationComponent(UnaryOperation.INVERT),
                'operation-normalize':   new allComponents.UnaryOperationComponent(UnaryOperation.NORMALIZE),
                'operation-transpose':   new allComponents.UnaryOperationComponent(UnaryOperation.TRANSPOSE),
                'operation-determinant': new allComponents.UnaryOperationComponent(UnaryOperation.DETERMINANT),

                'operation-add':         new allComponents.BinaryOperationComponent(BinaryOperation.ADD),
                'operation-subtract':    new allComponents.BinaryOperationComponent(BinaryOperation.SUBTRACT),
                'operation-multiply':    new allComponents.BinaryOperationComponent(BinaryOperation.MULTIPLY),
                'operation-divide':      new allComponents.BinaryOperationComponent(BinaryOperation.DIVIDE),
                'operation-dot':         new allComponents.BinaryOperationComponent(BinaryOperation.DOT_PRODUCT),
                'operation-cross':       new allComponents.BinaryOperationComponent(BinaryOperation.CROSS_PRODUCT),
                'operation-angle':       new allComponents.BinaryOperationComponent(BinaryOperation.ANGLE),
                'operation-projection':  new allComponents.BinaryOperationComponent(BinaryOperation.PROJECTION),
                'operation-exponent':    new allComponents.BinaryOperationComponent(BinaryOperation.EXPONENT),
            },
        };
    },

    methods: {
        test1() {
            // this.editor.trigger('resetconnection'); // TODO testing
            // console.log('test1 setting showAdvancedRenderSettings to ', !this.settings.values.showAdvancedRenderSettings);
            // this.settings.update('showAdvancedRenderSettings', !this.settings.values.showAdvancedRenderSettings);
            // const node = this.editor.nodes.find(node => node.name.startsWith('Vector'));
            // if (!node) { throw new Error('could not find vector node to test with'); }
            // const nodeView = this.editor.view.nodes.get(node);
            // console.log('node', node);
            // console.log('nodeView', nodeView);
            // this.showingAdvancedRenderControls = !this.showingAdvancedRenderControls;
            // console.log('now showing: ', this.showingAdvancedRenderControls);
            // /* Vue.set(node, 'hideAdvancedRenderControls', !this.showingAdvancedRenderControls); */
            // node.vueContext.showAdvancedRenderControls = this.showingAdvancedRenderControls;
            // /* console.log('forcing update', node, node.vueContext); */
            // /* node.vueContext.$forceUpdate(); */
        },
        test2() {
            // const node1 = this.editor.nodes.find(node => node.id === 5);
            // const node2 = this.editor.nodes.find(node => node.id === 6);
            // const output = node1.outputs.get('value');
            // const input = node2.inputs.get('pos');
            // this.editor.connect(output, input);
        },

        setUpBasicHistoryActions() {
            this.editor.on('nodecreated', node => history.add(new actions.AddNodeAction(this.editor, node)));
            this.editor.on('noderemoved', node => history.add(new actions.RemoveNodeAction(this.editor, node)));
            this.editor.on('nodetranslated', ({ node, prev }) => {
                if (_.isEqual(node.position, prev)) {
                    return;
                }
                // TODO may also want to enforce that we can't currently redo, otherwise you could move -> something else -> undo -> move (merged)
                if (history.last instanceof actions.DragNodeAction && history.last.node === node) {
                    history.last.update(node);
                } else {
                    history.add(new actions.DragNodeAction(this.editor, node, prev));
                }
            });

            this.editor.on('connectioncreated', c => history.add(new actions.AddConnectionAction(this.editor, c)));
            this.editor.on('connectionremoved', c => history.add(new actions.RemoveConnectionAction(this.editor, c)));
        },

        async addNode(nodeType) {
            console.log(`Add node (type ${nodeType})`);

            var node = null;
            switch (nodeType) {
            case 'scalar': {
                const color = this.settings.values.useRandomColors ? util.rgbToHex(...Object.values(util.getRandomColor())) : this.settings.values.defaultScalarColor;
                // TODO need a factory or something for these
                node = await this.components['scalar'].createNode({
                    'color': { color: color, visible: false },
                    'value': [1],
                    'pos': [0, 0, 0],
                });
                break;
            }
            case 'vector': {
                const color = this.settings.values.useRandomColors ? util.rgbToHex(...Object.values(util.getRandomColor())) : this.settings.values.defaultVectorColor;
                node = await this.components['vector'].createNode({
                    'color': { color: color, visible: true },
                    'value': [1, 1, 1],
                    'pos': [0, 0, 0],
                });
                break;
            }
            case 'matrix': {
                const color = this.settings.values.useRandomColors ? util.rgbToHex(...Object.values(util.getRandomColor())) : this.settings.values.defaultMatrixColor;
                node = await this.components['matrix'].createNode({
                    'color': { color: color, visible: false },
                    'value': [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1,
                    ],
                    'pos': [0, 0, 0],
                });
                break;
            }
            case 'operation-length':
            case 'operation-invert':
            case 'operation-normalize':
            case 'operation-transpose':
            case 'operation-determinant':
            case 'operation-add':
            case 'operation-subtract':
            case 'operation-multiply':
            case 'operation-divide':
            case 'operation-dot':
            case 'operation-cross':
            case 'operation-angle':
            case 'operation-projection':
            case 'operation-exponent':
                node = await this.components[nodeType].createNode();
                break;
            default:
                throw new Error(`Cannot add node of type ${nodeType}`);
            }

            this.editor.addNode(node);
            const nodeView = this.editor.view.nodes.get(node);

            node.position = this.getNewNodePos(node, nodeView);
            console.log('Added node at position', node.position);

            // Normally addNode triggers this update, but since I updated the position *after* adding the node, I need to do it manually
            // TODO: If this causes any performance issues, I can cache node sizes per type so we only need to manually update the first time
            //       a certain type is created
            nodeView.update();

            this.newNodesShouldBeCentered = false;
            this.lastNodePosition = node.position.slice();
        },

        getNewNodePos(node, nodeView) {
            const editorX = this.editor.view.area.transform.x;
            const editorY = this.editor.view.area.transform.y;
            const nodeEditorWidth = this.editor.view.container.parentElement.parentElement.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement.parentElement.clientHeight;
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

        deleteNode() {
            this.editor.selected.each(node => {
                this.editor.removeNode(node);
            });
        },

        onUndo() {
            console.log('UNDO');
            try {
                // this.currentlyHandlingHistoryAction = true;
                // /* console.log('before trigger undo', this.editor.plugins); */
                // this.editor.trigger('undo'); // TODO sometimes a dragnodeaction is getting added when I click to change values
                // /* console.log('after trigger undo', result); */
                // this.$nextTick(() => {
                //     this.currentlyHandlingHistoryAction = false;
                // });
                history.disable();
                history.undo();
                // HACK: Disable new history items from being added for the whole tick; the default behavior only disables it
                //       while undo() is on the call stack, but since we may add new history items via watchers, the history
                //       will be re-enabled by that point
                // TODO: Does that just mean that I shouldn't use watchers with fields that could trigger history?
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
            const nodeEditorWidth = this.editor.view.container.parentElement.parentElement.clientWidth;
            const nodeEditorHeight = this.editor.view.container.parentElement.parentElement.clientHeight;
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

        async loadNodes() {
            // const savedEditorJson = null;
            const savedEditorJson = JSON.parse(window.localStorage.getItem('node_editor'));

            if (savedEditorJson) {
                console.log('LOADING:', savedEditorJson);
                const success = await this.editor.fromJSON(savedEditorJson);
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

        async createDemoNodes() {
            const [scalarLhs, scalarRhs, scalarAdd, scalarOut, vecLhs, vecRhs, vecAdd, vecOut] = await Promise.all([
                // TODO color stuff is still pretty gross
                this.components['scalar'].createNode({ 'value': [5], 'pos': [0, 0, 0], 'color': { color: '#ff7f00', visible: true } }),
                this.components['scalar'].createNode({ 'value': [4], 'pos': [0, 0, 0], 'color': { color: '#ff7f00', visible: true } }),
                this.components['operation-add'].createNode(),
                this.components['scalar'].createNode({ 'value': [0], 'pos': [0, 0, 0], 'color': { color: this.settings.values.defaultScalarColor, visible: true } }),
                this.components['vector'].createNode({ 'value': [3, 2, 1], 'pos': [0, 0, 0], 'color': { color: '#00ffff', visible: true } }),
                this.components['vector'].createNode({ 'value': [2, 2, 2], 'pos': [0, 0, 0], 'color': { color: '#00ffff', visible: true } }),
                this.components['operation-add'].createNode(),
                this.components['vector'].createNode({ 'pos': [0, 0, 0], 'color': { color: this.settings.values.defaultVectorColor, visible: true } }),
            ]);
            scalarLhs.position = [20, 80];
            scalarRhs.position = [20, 190];
            scalarAdd.position = [180, 120];
            scalarOut.position = [300, 120];
            vecLhs.position = [460, 80];
            vecRhs.position = [460, 240];
            vecAdd.position = [730, 160];
            vecOut.position = [860, 140];

            this.editor.addNode(scalarLhs);
            this.editor.addNode(scalarRhs);
            this.editor.addNode(scalarAdd);
            this.editor.addNode(scalarOut);
            this.editor.addNode(vecLhs);
            this.editor.addNode(vecRhs);
            this.editor.addNode(vecAdd);
            this.editor.addNode(vecOut);

            this.editor.connect(scalarLhs.outputs.get('value'), scalarAdd.inputs.get('lhs'));
            this.editor.connect(scalarRhs.outputs.get('value'), scalarAdd.inputs.get('rhs'));
            this.editor.connect(scalarAdd.outputs.get('result'), scalarOut.inputs.get('value'));
            this.editor.connect(vecLhs.outputs.get('value'), vecAdd.inputs.get('lhs'));
            this.editor.connect(vecRhs.outputs.get('value'), vecAdd.inputs.get('rhs'));
            this.editor.connect(vecAdd.outputs.get('result'), vecOut.inputs.get('value'));
        },

        saveState() {
            console.log('Saving editor state to browser-local storage', this.editor.toJSON());
            window.localStorage.setItem('node_editor', JSON.stringify(this.editor.toJSON()));
            window.localStorage.setItem('node_editor_view_transform', JSON.stringify(this.editor.view.area.transform));
        },

        async loadState() {
            console.log('Loading node editor from local storage');

            const viewTransform = JSON.parse(window.localStorage.getItem('node_editor_view_transform'));
            if (viewTransform) {
                this.editor.view.area.transform = viewTransform;
                this.editor.view.area.update();
            }

            await this.loadNodes();
        },

        postLoad() {
            // Don't set up undo/redo callbacks until after finished loading to prevent user from undoing load
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

            // // TODO should at least name this event something different to avoid confusion
            // EventBus.$on('addhistory', action => {
            //     // Bit of a hack; prevent changes that happen as a result of undo/redo from themselves being added to the history stack
            //     // (which would erase any potential redo-able actions)
            //     // The History plugin already does something like this to prevent infinite recursion, but that only works within the same
            //     // stack frame, whereas this works for the whole Vue tick (important when a watcher is the one adding the history)
            //     if (!this.currentlyHandlingHistoryAction) {
            //         this.editor.trigger('addhistory', action);
            //     }
            // });

            this.editor.on('zoom', ({transform, zoom, source}) => {
                return (this.minZoom <= zoom && zoom <= this.maxZoom);
            });

            this.editor.on('translated zoomed', () => {
                this.newNodesShouldBeCentered = true;
            });

            this.editor.on('connectionpick', io => {
                const isOutput = io instanceof Rete.Output;
                const disabled = io.node.data['disabled'] || false;
                return !(isOutput && disabled);
            });

            this.engine.on('error', ({message, data}) => {
                const msg = `Error in Rete engine: ${message}`;
                alert(msg);
                console.error(msg);
                console.info(data);
            });

            // this.engine.on('warn', (exc) => {
            //     console.warn(`Warning from Rete engine`);
            //     console.warn(exc);
            // });
        },

        async handleEngineProcess() {
            console.log('NodeEditor handleEngineProcess', this.editor.toJSON());
            await this.engine.abort(); // Stop old job if running // TODO this is not syncronized with other invocations of handleEngineProcess
            await this.engine.process(this.editor.toJSON());

            // TODO should I save during more events?
            this.saveState();

            EventBus.$emit('node_engine_processed', this.editor.toJSON());
        },

        handleConnectionChanged() {
            console.log('NodeEditor handleConnectionChanged');
            updateAllSockets(this.engine, this.editor);
        },

        addOrRemoveAdvancedControls(add) {
            console.log('adding or removing advanced render controls', add);
            const actionStack = [];
            const graphTraveler = new GraphTraveler(this.engine, this.editor);
            graphTraveler.applyToAllNodes((engineNode, editorNode) => {
                if (editorNode.inputs.has('pos')) { // TODO make this more generic
                    console.log('NodeEditor advanced render controls handler', engineNode, editorNode);
                    if (add) {
                        const renderControlsAction = new actions.AddAdvancedRenderControlsAction(this.editor, editorNode);
                        actionStack.push(renderControlsAction);
                    } else {
                        // Reset origin
                        // TODO probably should be bundled in with RemoveAdvancedRenderControlsAction, but it's convenient to
                        //      use FieldChangeAction (which I could still do inside of RemoveAdvancedRenderControlsAction)
                        const resetOriginAction = new actions.FieldChangeAction(engineNode.data['pos'], [0, 0, 0], val => {
                            engineNode.data['pos'] = val;
                            // Make sure 'pos' changes are processed
                            this.editor.trigger('process'); // TODO I could maybe go through vue component to make sure this happens automatically
                        });
                        actionStack.push(resetOriginAction);

                        // console.log('Pushing RemoveAdvancedRenderControlsAction', this.editor, engineNode);
                        const renderControlsAction = new actions.RemoveAdvancedRenderControlsAction(this.editor, editorNode);
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

        this.container = document.getElementById('rete');
        this.editor = new Rete.NodeEditor(this.version, this.container);

        this.editor.use(ConnectionPlugin);
        this.editor.use(VueRenderPlugin);
        console.log('NodeEditor mounted, plugins list:', this.editor.plugins);
        console.log('NodeEditor mounted, events:', this.editor.events);
        // console.log('NodeEditor mounted, connectionremoved:', this.editor.events['connectionremoved']);
        // console.log('NodeEditor mounted, connectionremoved handlers:', this.editor.events['connectionremoved'].handlers);

        this.engine = new Rete.Engine(this.version);

        EventBus.$on('split-resized', () => {
            this.editor.view.resize();
        });

        EventBus.$on('show-advanced-controls-toggled', val => {
            this.addOrRemoveAdvancedControls(val);
        });

        Object.keys(this.components).map(key => {
            this.editor.register(this.components[key]);
            this.engine.register(this.components[key]);
        });

        this.editor.on('nodecreated', node => {
            // TODO why am I doing this to every node instead of only the one that was just created?
            Array.prototype.map.call(document.getElementsByClassName('node'), nodeView => {
                nodeView.addEventListener('contextmenu', event => {
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

            // Don't trigger any of these events until after the initial load is done
            // TODO still not perfect, doesn't prevent multiple changes from user getting queued up; is there something like Java's 'synchronized' keyword?
            this.editor.on('process nodecreated noderemoved connectioncreated connectionremoved', this.handleEngineProcess);
            await this.handleEngineProcess(); // Process at least once to make sure the viewports are updated // TODO figure out where this really belongs; the order of events here is not very clear

            // Engine updates should come first because it effects the node data that we iterate over
            this.editor.on('connectioncreated connectionremoved', this.handleConnectionChanged);
            this.handleConnectionChanged(); // Run once to set up socket types
        })();

        this.editor.view.resize();
        this.editor.trigger('process');

        this.$nextTick(() => {
            // For some reason the initial render has a scroll bar, so need to force resize again to take up whole container
            this.editor.view.resize();
        });
    },
};
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
    .buttons-group:first-child
      margin-left: 8px
    button.v-btn
      pointer-events: auto
      // &:first-of-type
      //   margin-left: 8px
      margin-right: 8px
      .v-icon
        height: 24px
        width: 24px // TODO v-icon "size" attribute doesn't set this?
        font-size: 24px
    display: flex
    position: absolute
    left: 5px
    top: 12px
    right: 5px
    .buttons-spacer
      flex-grow: 1
      pointer-events: none
.rete
  display: block
  height: 100%
  min-height: 100vh
  border: 2px solid #bbbbbb
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
    background-color: #696969 // hehe
</style>
