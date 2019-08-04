module.exports = {
    runtimeCompiler: true,
    chainWebpack: (config) => {
        // vue-svg-loader config -- allow using svg files as Vue components
        const svgRule = config.module.rule('svg');
        svgRule.uses.clear();
        svgRule
            .use('vue-svg-loader')
            .loader('vue-svg-loader');
    },
}
