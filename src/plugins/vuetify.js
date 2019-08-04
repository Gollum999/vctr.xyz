import Vue from 'vue';
import Vuetify from 'vuetify/lib';

import ScalarIcon from '@/assets/scalar.svg';
import VectorIcon from '@/assets/vector.svg';
import MatrixIcon from '@/assets/matrix.svg';
import OperationIcon from '@/assets/operation.svg';

Vue.use(Vuetify);

export default new Vuetify({
    icons: {
        iconfont: 'mdi',
        values: {
            'scalar': { component: ScalarIcon },
            'vector': { component: VectorIcon },
            'matrix': { component: MatrixIcon },
            'operation': { component: OperationIcon },
        },
    },
});
