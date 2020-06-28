import _ from 'lodash';
import { vec3, mat4 } from 'gl-matrix';
import Rete from 'rete';
// import VueRenderPlugin from 'rete-vue-render-plugin';

import * as allComponents from '@/node_editor/components';
import sockets from '@/node_editor/sockets';
import { ValueNodeType } from '@/node_editor/node_util';

const module = require('@/node_editor/BasicOperationComponent.js');
const s                          = module.__get__('s');
const socketTypesToCompoundSocket = module.__get__('socketTypesToCompoundSocket');
const AddOperation               = module.__get__('AddOperation');
const SubtractOperation          = module.__get__('SubtractOperation');
const MultiplyOperation          = module.__get__('MultiplyOperation');
const DivideOperation            = module.__get__('DivideOperation');
const DotOperation               = module.__get__('DotOperation');
const CrossOperation             = module.__get__('CrossOperation');

describe('socketTypesToCompoundSocket', () => {
    it('should return the correct types', () => {
        expect( socketTypesToCompoundSocket(new Set(['scalar']))                     ).toBe('scalar');
        expect( socketTypesToCompoundSocket(new Set(['vector']))                     ).toBe('vector');
        expect( socketTypesToCompoundSocket(new Set(['matrix']))                     ).toBe('matrix');
        expect( socketTypesToCompoundSocket(new Set(['scalar', 'vector']))           ).toBe('scalarOrVector');
        expect( socketTypesToCompoundSocket(new Set(['scalar', 'matrix']))           ).toBe('scalarOrMatrix');
        expect( socketTypesToCompoundSocket(new Set(['vector', 'matrix']))           ).toBe('vectorOrMatrix');
        expect( socketTypesToCompoundSocket(new Set(['scalar', 'vector', 'matrix'])) ).toBe('anything');
    });
    it('should throw when given bad inputs', () => {
        expect( () => { socketTypesToCompoundSocket(['invalid']); } ).toThrow('socketTypesToCompoundSocket: Input should be of type Set');

        const msg = 'Could not determine socket name from list';
        expect( () => { socketTypesToCompoundSocket(new Set(['invalid']));                               } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['ignore']));                                } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['anything']));                              } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['scalarOrVector']));                        } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['scalarOrMatrix']));                        } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['vectorOrMatrix']));                        } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['scalar', 'invalid']));                     } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['scalar', 'vector', 'invalid']));           } ).toThrow(msg);
        expect( () => { socketTypesToCompoundSocket(new Set(['scalar', 'vector', 'matrix', 'invalid'])); } ).toThrow(msg);
    });
});

const m1 = [
    1, 0,  0,  0,
    0, 1,  0,  0,
    0, 0,  1,  0,
    0, 0,  0,  1,
];
const m2 = [
     2, 1,  0, -1,
     1, 2,  3,  4,
     0, 0,  0,  0,
    -1, 1, -1,  1,
];

function testAddSubtractOperationExceptions(op, msg) {
    expect( () => { op.calculate({type: 'scalar', value: 2},         {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
    expect( () => { op.calculate({type: 'scalar', value: 2},         {type: 'matrix', value: m1});        } ).toThrow(msg);
    expect( () => { op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'scalar', value: 0});         } ).toThrow(msg);
    expect( () => { op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'matrix', value: m1});        } ).toThrow(msg);
    expect( () => { op.calculate({type: 'matrix', value: m1},        {type: 'scalar', value: 1});         } ).toThrow(msg);
    expect( () => { op.calculate({type: 'matrix', value: m1},        {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
    expect( () => { op.calculate({type: 'scalar', value: 2},         {type: 'invalid', value: null});     } ).toThrow(msg);
}

describe('AddOperation', () => {
    const Op = AddOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'scalar', value: [1]},       {type: 'scalar', value: [2]})       ).toEqual([3]);
        expect( Op.calculate({type: 'vector', value: [1, 2, 3]}, {type: 'vector', value: [4, 5, 6]}) ).toEqual(vec3.fromValues(5, 7, 9));
        expect( Op.calculate({type: 'matrix', value: m1},        {type: 'matrix', value: m2})        ).toEqual(mat4.fromValues(
             3, 1,  0, -1,
             1, 3,  3,  4,
             0, 0,  1,  0,
            -1, 1, -1,  2,
        ));
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'AddOperation unsupported input types';
        testAddSubtractOperationExceptions(Op, msg);
    });
});

describe('SubtractOperation', () => {
    const Op = SubtractOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'scalar', value: [1]},       {type: 'scalar', value: [2]})       ).toEqual([-1]);
        expect( Op.calculate({type: 'vector', value: [1, 2, 3]}, {type: 'vector', value: [4, 5, 6]}) ).toEqual(vec3.fromValues(-3, -3, -3));
        expect( Op.calculate({type: 'matrix', value: m1},        {type: 'matrix', value: m2})        ).toEqual(mat4.fromValues(
            -1, -1,  0,  1,
            -1, -1, -3, -4,
             0,  0,  1,  0,
             1, -1,  1,  0,
        ));
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'SubtractOperation unsupported input types';
        testAddSubtractOperationExceptions(Op, msg);
    });
});

describe('MultiplyOperation', () => {
    const Op = MultiplyOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'scalar', value: [2]},       {type: 'scalar', value: [4]})       ).toEqual([8]);
        expect( Op.calculate({type: 'scalar', value: [2]},       {type: 'vector', value: [2, 2, 3]}) ).toEqual(vec3.fromValues(4, 4, 6));
        expect( Op.calculate({type: 'scalar', value: [2]},       {type: 'matrix', value: m2})        ).toEqual(mat4.fromValues(
             4, 2,  0, -2,
             2, 4,  6,  8,
             0, 0,  0,  0,
            -2, 2, -2,  2,
        ));
        expect( Op.calculate({type: 'vector', value: [1, 2, 3]}, {type: 'scalar', value: [-3]})      ).toEqual(vec3.fromValues(-3, -6, -9));
        expect( Op.calculate({type: 'matrix', value: m1},        {type: 'vector', value: [1, 2, 3]}) ).toEqual(vec3.fromValues(1, 2, 3));
        expect( Op.calculate({type: 'matrix', value: m2},        {type: 'scalar', value: [-2]})      ).toEqual(mat4.fromValues(
            -4, -2, -0,  2,
            -2, -4, -6, -8,
            -0, -0, -0, -0,
             2, -2,  2, -2,
        ));
        expect( Op.calculate({type: 'matrix', value: m1},        {type: 'matrix', value: m2})        ).toEqual(mat4.fromValues(...m2));
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'MultiplyOperation unsupported input types';
        expect( () => { Op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'vector', value: [0, 1, 0]}); } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'vector', value: [0, 0, 0]}, {type: 'matrix', value: m1});        } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'scalar', value: [2]},       {type: 'invalid', value: null});     } ).toThrow(msg);
    });
});

describe('DivideOperation', () => {
    const Op = DivideOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'scalar', value: [2]},       {type: 'scalar', value: [4]}) ).toEqual([0.5]);
        expect( Op.calculate({type: 'vector', value: [4, 2, 1]}, {type: 'scalar', value: [2]}) ).toEqual(vec3.fromValues(2, 1, 0.5));
        expect( Op.calculate({type: 'matrix', value: m2},        {type: 'scalar', value: [2]}) ).toEqual(mat4.fromValues(
               1, 0.5,    0, -0.5,
             0.5,   1,  1.5,    2,
               0,   0,    0,    0,
            -0.5, 0.5, -0.5,  0.5,
        ));
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'DivideOperation unsupported input types';
        expect( () => { Op.calculate({type: 'scalar', value: [2]},       {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'scalar', value: [2]},       {type: 'matrix', value: m1});        } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'vector', value: [2, 2, 2]}); } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'matrix', value: m1});        } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'matrix', value: m1},        {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'matrix', value: m1},        {type: 'matrix', value: m2});        } ).toThrow(msg);
        expect( () => { Op.calculate({type: 'invalid', value: null},     {type: 'scalar', value: [5]});       } ).toThrow(msg);
    });
});

function testDotCrossOperationExceptions(op, msg) {
    expect( () => { op.calculate({type: 'scalar', value: [2]},       {type: 'scalar', value: [4]});       } ).toThrow(msg);
    expect( () => { op.calculate({type: 'scalar', value: [2]},       {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
    expect( () => { op.calculate({type: 'scalar', value: [2]},       {type: 'matrix', value: m1});        } ).toThrow(msg);
    expect( () => { op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'scalar', value: [2]});       } ).toThrow(msg);
    expect( () => { op.calculate({type: 'vector', value: [1, 1, 1]}, {type: 'matrix', value: m1});        } ).toThrow(msg);
    expect( () => { op.calculate({type: 'matrix', value: m1},        {type: 'scalar', value: [5]});       } ).toThrow(msg);
    expect( () => { op.calculate({type: 'matrix', value: m1},        {type: 'vector', value: [0, 0, 0]}); } ).toThrow(msg);
    expect( () => { op.calculate({type: 'matrix', value: m1},        {type: 'matrix', value: m2});        } ).toThrow(msg);
    expect( () => { op.calculate({type: 'vector', value: [1, 2, 3]}, {type: 'invalid', value: null});     } ).toThrow(msg);
}

describe('DotOperation', () => {
    const Op = DotOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'vector', value: [4, 2, 1]}, {type: 'vector', value: [3, -2, 3]}) ).toEqual([11]);
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'DotOperation unsupported input types';
        testDotCrossOperationExceptions(Op, msg);
    });
});

describe('CrossOperation', () => {
    const Op = CrossOperation;
    it('should work with certain input types', () => {
        expect( Op.calculate({type: 'vector', value: [4, 2, 1]}, {type: 'vector', value: [3, -2, 3]}) ).toEqual(vec3.fromValues(8, -9, -14));
    });
    it('should throw when given an unsupported combination of input types', () => {
        const msg = 'CrossOperation unsupported input types';
        testDotCrossOperationExceptions(Op, msg);
    });
});

function checkSocketTypes(node, {lhs, rhs, output}) {
    expect(node.inputs.size).toEqual(2);
    expect(node.outputs.size).toEqual(1);
    // We could check the whole socket object, but the error messages when there is a mismatch are pretty gross
    // Rete expects the socket name to be unique, so just use that
    expect(node.inputs.get('lhs').socket.name).toEqual(lhs.name);
    expect(node.inputs.get('rhs').socket.name).toEqual(rhs.name);
    expect(node.outputs.get('result').socket.name).toEqual(output.name);
}

async function processAndCheck(engine, editor, node, {lhs, rhs, output}) {
    await engine.process(editor.toJSON());
    module.updateAllSockets(engine, editor);
    checkSocketTypes(node, {lhs, rhs, output});
}

function checkConnectionCounts(node, {lhs, rhs, output}) {
    expect(node.inputs.get('lhs').connections.length).toEqual(lhs);
    expect(node.inputs.get('rhs').connections.length).toEqual(rhs);
    expect(node.outputs.get('result').connections.length).toEqual(output);
}

async function removeAllConnections(engine, editor, node) {
    node.getConnections().forEach(c => editor.removeConnection(c));
    await engine.process(editor.toJSON());
    module.updateAllSockets(engine, editor);
}

describe('BasicOperationComponent', () => {
    let editor, engine, components;
    beforeAll(() => {
        document.body.innerHTML = '<div id="test-div"></div>';
        const el = document.getElementById('test-div');
        editor = new Rete.NodeEditor('BasicOperationComponent_spec_js@1.0.0', el);
        // The render plugin is indirectly responsible for populating the sockets member of the NodeView class; enabling the plugin suppresses
        //   errors about missing sockets // TODO though theoretically the render layer should not be necessary for these tests...
        // editor.use(VueRenderPlugin); // TODO this causes the JS heap to run out of memory somehow?
        engine = new Rete.Engine('BasicOperationComponent_spec_js@1.0.0'); // TODO do I need an engine for this test?

        components = {
            'scalar':             new allComponents.ValueComponent(ValueNodeType.SCALAR),
            'vector':             new allComponents.ValueComponent(ValueNodeType.VECTOR),
            'matrix':             new allComponents.ValueComponent(ValueNodeType.MATRIX),
            'operation-add':      new allComponents.BasicOperationComponent('Add'),
            'operation-subtract': new allComponents.BasicOperationComponent('Subtract'),
            'operation-multiply': new allComponents.BasicOperationComponent('Multiply'),
            'operation-divide':   new allComponents.BasicOperationComponent('Divide'),
            'operation-dot':      new allComponents.BasicOperationComponent('Dot Product'),
            'operation-cross':    new allComponents.BasicOperationComponent('Cross Product'),
        };
        Object.keys(components).map(key => {
            editor.register(components[key]);
            engine.register(components[key]);
        });

        // Translate events into exceptions for easy testing
        editor.on('warn error', err => {
            if (err.message.includes('Socket not fount') || err.message.includes('View node not fount')) {
                // These errors are from the view layer.  Not sure how to prevent, so just ignore
                return;
            }
            throw new Error(err);
        });
        engine.on('warn error', err => {
            throw new Error(err);
        });

        // Remove console warning/error handlers to keep test output clean
        _.remove(editor.events.warn, el => el === console.warn);
        _.remove(editor.events.error, el => el === console.error);
    });

    let scalar, vector, matrix, add, subtract, multiply, divide, dot, cross;
    beforeEach(async () => {
        editor.clear();
        await engine.process(editor.toJSON()); // Make sure the engine is updated too, otherwise node IDs can get out of sync

        editor.addNode(scalar   = await components['scalar'].createNode({'value': [5]}));
        editor.addNode(vector   = await components['vector'].createNode({'value': [1, 2, 3]}));
        editor.addNode(matrix   = await components['matrix'].createNode({'value': m1}));
        editor.addNode(add      = await components['operation-add'].createNode());
        editor.addNode(subtract = await components['operation-subtract'].createNode());
        editor.addNode(multiply = await components['operation-multiply'].createNode());
        editor.addNode(divide   = await components['operation-divide'].createNode());
        editor.addNode(dot      = await components['operation-dot'].createNode());
        editor.addNode(cross    = await components['operation-cross'].createNode());

        for (const node of [scalar, vector, matrix, add, subtract, multiply, divide, dot, cross]) {
            // Hack to avoid exceptions when adding and removing connections
            // Theoretically the object we are faking is all in the view layer and should have no impact on these tests
            node.controls.forEach((v, k) => { v.vueContext = {} });
        }
    });

    it('should have appropriate default socket types', () => {
        expect(scalar.outputs.size).toEqual(1);
        expect(scalar.outputs.get('value').socket).toEqual(sockets.scalar);
        expect(vector.outputs.size).toEqual(1);
        expect(vector.outputs.get('value').socket).toEqual(sockets.vector);
        expect(matrix.outputs.size).toEqual(1);
        expect(matrix.outputs.get('value').socket).toEqual(sockets.matrix);

        checkSocketTypes(add,      { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        checkSocketTypes(subtract, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        checkSocketTypes(multiply, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        checkSocketTypes(divide,   { lhs: sockets.anything, rhs: sockets.scalar,   output: sockets.anything });
        checkSocketTypes(dot,      { lhs: sockets.vector,   rhs: sockets.vector,   output: sockets.scalar   });
        checkSocketTypes(cross,    { lhs: sockets.vector,   rhs: sockets.vector,   output: sockets.vector   });
    });

    describe('AddOperation', () => {
        it('should update socket types as connections are added and removed', async () => {
            const lhs = add.inputs.get('lhs');
            const rhs = add.inputs.get('rhs');
            const out = add.inputs.get('result');
            const outSocketScalar = scalar.outputs.get('value');
            const outSocketVector = vector.outputs.get('value');
            const outSocketMatrix = matrix.outputs.get('value');

            await processAndCheck(engine, editor, add, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });

            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, add, { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });

            expect( () => editor.connect(outSocketVector, rhs) ).toThrow('Sockets not compatible');

            await removeAllConnections(engine, editor, add);
            await processAndCheck(engine, editor, add, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });

            editor.connect(outSocketVector, rhs);
            await processAndCheck(engine, editor, add, { lhs: sockets.vector, rhs: sockets.vector, output: sockets.vector });

            await removeAllConnections(engine, editor, add);
            editor.connect(outSocketMatrix, rhs);
            await processAndCheck(engine, editor, add, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        });
    });

    describe('SubtractOperation', () => {
        it('should update socket types as connections are added and removed', async () => {
            const lhs = subtract.inputs.get('lhs');
            const rhs = subtract.inputs.get('rhs');
            const out = subtract.inputs.get('result');
            const outSocketScalar = scalar.outputs.get('value');
            const outSocketVector = vector.outputs.get('value');
            const outSocketMatrix = matrix.outputs.get('value');

            await processAndCheck(engine, editor, subtract, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });

            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, subtract, { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });

            expect( () => editor.connect(outSocketVector, rhs) ).toThrow('Sockets not compatible');

            await removeAllConnections(engine, editor, subtract);
            await processAndCheck(engine, editor, subtract, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });

            editor.connect(outSocketVector, rhs);
            await processAndCheck(engine, editor, subtract, { lhs: sockets.vector, rhs: sockets.vector, output: sockets.vector });

            await removeAllConnections(engine, editor, subtract);
            editor.connect(outSocketMatrix, rhs);
            await processAndCheck(engine, editor, subtract, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        });
    });

    describe('MultiplyOperation', () => {
        it('should update socket types as connections are added and removed', async () => {
            const lhs = multiply.inputs.get('lhs');
            const rhs = multiply.inputs.get('rhs');
            const out = multiply.inputs.get('result');
            const outSocketScalar = scalar.outputs.get('value');
            const outSocketVector = vector.outputs.get('value');
            const outSocketMatrix = matrix.outputs.get('value');

            await processAndCheck(engine, editor, multiply, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });

            // Scalar connections
            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.scalar, rhs: sockets.anything, output: sockets.anything });
            await removeAllConnections(engine, editor, multiply);
            editor.connect(outSocketScalar, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.anything, rhs: sockets.scalar, output: sockets.anything });
            await removeAllConnections(engine, editor, multiply);

            // Vector connection LHS
            editor.connect(outSocketVector, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.vector, rhs: sockets.scalar, output: sockets.vector });
            expect( () => editor.connect(outSocketVector, rhs) ).toThrow('Sockets not compatible');
            await removeAllConnections(engine, editor, multiply);

            // Vector connection RHS
            editor.connect(outSocketVector, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.scalarOrMatrix, rhs: sockets.vector, output: sockets.vector });
            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.scalar, rhs: sockets.vector, output: sockets.vector });
            await removeAllConnections(engine, editor, multiply);
            editor.connect(outSocketVector, rhs);
            editor.connect(outSocketMatrix, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.vector, output: sockets.vector });
            await removeAllConnections(engine, editor, multiply);

            // Matrix connection LHS
            editor.connect(outSocketMatrix, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.anything, output: sockets.vectorOrMatrix });
            editor.connect(outSocketScalar, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.scalar, output: sockets.matrix });
            await removeAllConnections(engine, editor, multiply);
            editor.connect(outSocketMatrix, lhs);
            editor.connect(outSocketVector, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.vector, output: sockets.vector });
            await removeAllConnections(engine, editor, multiply);
            editor.connect(outSocketMatrix, lhs);
            editor.connect(outSocketMatrix, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
            await removeAllConnections(engine, editor, multiply);

            // Matrix connection RHS
            editor.connect(outSocketMatrix, rhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.scalarOrMatrix, rhs: sockets.matrix, output: sockets.matrix });
            expect( () => editor.connect(outSocketVector, lhs) ).toThrow('Sockets not compatible');
            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.scalar, rhs: sockets.matrix, output: sockets.matrix });
            await removeAllConnections(engine, editor, multiply);
            editor.connect(outSocketMatrix, rhs);
            editor.connect(outSocketMatrix, lhs);
            await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        });
    });

    describe('DivideOperation', () => {
        it('should update socket types as connections are added and removed', async () => {
            const lhs = divide.inputs.get('lhs');
            const rhs = divide.inputs.get('rhs');
            const out = divide.inputs.get('result');
            const outSocketScalar = scalar.outputs.get('value');
            const outSocketVector = vector.outputs.get('value');
            const outSocketMatrix = matrix.outputs.get('value');

            await processAndCheck(engine, editor, divide, { lhs: sockets.anything, rhs: sockets.scalar, output: sockets.anything });

            expect( () => editor.connect(outSocketVector, rhs) ).toThrow('Sockets not compatible');

            editor.connect(outSocketScalar, lhs);
            await processAndCheck(engine, editor, divide, { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });

            expect( () => editor.connect(outSocketVector, rhs) ).toThrow('Sockets not compatible');
            expect( () => editor.connect(outSocketMatrix, rhs) ).toThrow('Sockets not compatible');

            await removeAllConnections(engine, editor, divide);
            await processAndCheck(engine, editor, divide, { lhs: sockets.anything, rhs: sockets.scalar, output: sockets.anything });

            editor.connect(outSocketVector, lhs);
            await processAndCheck(engine, editor, divide, { lhs: sockets.vector, rhs: sockets.scalar, output: sockets.vector });

            await removeAllConnections(engine, editor, divide);
            editor.connect(outSocketMatrix, lhs);
            await processAndCheck(engine, editor, divide, { lhs: sockets.matrix, rhs: sockets.scalar, output: sockets.matrix });
        });
    });

    it('should handle cascading socket type changes', async () => {
        // Hook up Add -> Multiply -> Subtract -> Divide
        editor.connect(add.outputs.get('result'), multiply.inputs.get('lhs'));
        editor.connect(add.outputs.get('result'), multiply.inputs.get('rhs'));
        editor.connect(multiply.outputs.get('result'), subtract.inputs.get('lhs'));
        editor.connect(multiply.outputs.get('result'), subtract.inputs.get('rhs'));
        editor.connect(subtract.outputs.get('result'), divide.inputs.get('lhs'));
        editor.connect(subtract.outputs.get('result'), divide.inputs.get('rhs'));
        await processAndCheck(engine, editor, add,      { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        await processAndCheck(engine, editor, multiply, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        await processAndCheck(engine, editor, subtract, { lhs: sockets.anything, rhs: sockets.anything, output: sockets.anything });
        await processAndCheck(engine, editor, divide,   { lhs: sockets.anything, rhs: sockets.scalar,   output: sockets.anything });

        // Add      (scalar, scalar) -> (scalar) Multiply: ok, output = scalar
        // Multiply (scalar, scalar) -> (scalar) Subtract: ok, output = scalar
        // Subtract (scalar, scalar) -> (scalar) Divide:   ok, output = scalar
        editor.connect(scalar.outputs.get('value'), add.inputs.get('lhs'));
        await processAndCheck(engine, editor, add,      { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });
        await processAndCheck(engine, editor, multiply, { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });
        await processAndCheck(engine, editor, subtract, { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });
        await processAndCheck(engine, editor, divide,   { lhs: sockets.scalar, rhs: sockets.scalar, output: sockets.scalar });
        checkConnectionCounts(add,      { lhs: 1, rhs: 0, output: 2 });
        checkConnectionCounts(multiply, { lhs: 1, rhs: 1, output: 2 });
        checkConnectionCounts(subtract, { lhs: 1, rhs: 1, output: 2 });
        checkConnectionCounts(divide,   { lhs: 1, rhs: 1, output: 0 });
        await removeAllConnections(engine, editor, scalar);

        // Add      (vector, vector) -> (vector) Multiply: invalid, disconnect RHS, output = vector
        // Multiply (vector, vector) -> (vector) Subtract: ok,                      output = vector
        // Subtract (vector, vector) -> (vector) Divide:   invalid, disconnect RHS, output = vector
        editor.connect(vector.outputs.get('value'), add.inputs.get('lhs'));
        await processAndCheck(engine, editor, add,      { lhs: sockets.vector, rhs: sockets.vector, output: sockets.vector });
        await processAndCheck(engine, editor, multiply, { lhs: sockets.vector, rhs: sockets.scalar, output: sockets.vector });
        await processAndCheck(engine, editor, subtract, { lhs: sockets.vector, rhs: sockets.vector, output: sockets.vector });
        await processAndCheck(engine, editor, divide,   { lhs: sockets.vector, rhs: sockets.scalar, output: sockets.vector });
        checkConnectionCounts(add,      { lhs: 1, rhs: 0, output: 1 });
        checkConnectionCounts(multiply, { lhs: 1, rhs: 0, output: 2 }); // RHS connection is removed LHS 'vector' requires RHS 'scalar'
        checkConnectionCounts(subtract, { lhs: 1, rhs: 1, output: 1 });
        checkConnectionCounts(divide,   { lhs: 1, rhs: 0, output: 0 }); // RHS connection is removed LHS 'vector' requires RHS 'scalar'
        await removeAllConnections(engine, editor, vector);
        editor.connect(add.outputs.get('result'), multiply.inputs.get('rhs')); // Reconnect tho add -> multiply connection that was just removed

        // Add      (matrix, matrix) -> (matrix) Multiply: ok,                      output = matrix
        // Multiply (matrix, matrix) -> (matrix) Subtract: ok,                      output = matrix
        // Subtract (matrix, matrix) -> (matrix) Divide:   invalid, disconnect RHS, output = matrix
        editor.connect(matrix.outputs.get('value'), add.inputs.get('rhs'));
        await processAndCheck(engine, editor, add,      { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        await processAndCheck(engine, editor, multiply, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        await processAndCheck(engine, editor, subtract, { lhs: sockets.matrix, rhs: sockets.matrix, output: sockets.matrix });
        await processAndCheck(engine, editor, divide,   { lhs: sockets.matrix, rhs: sockets.scalar, output: sockets.matrix });
        checkConnectionCounts(add,      { lhs: 0, rhs: 1, output: 2 });
        checkConnectionCounts(multiply, { lhs: 1, rhs: 1, output: 2 });
        checkConnectionCounts(subtract, { lhs: 1, rhs: 1, output: 1 });
        checkConnectionCounts(divide,   { lhs: 1, rhs: 0, output: 0 }); // RHS connection is removed LHS 'matrix' requires RHS 'scalar'
        await removeAllConnections(engine, editor, matrix);
    });
});
