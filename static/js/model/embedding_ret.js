// var tf = require('@tensorflow/tfjs-node');

export class EmbeddingRet extends tf.layers.Layer {
    constructor(...args) {
        super(...args);
        this.embeddingObject = tf.layers.embedding(...args);
    }

    computeOutputShape(inputShape) {
        return [
            this.embeddingObject.computeOutputShape(inputShape),
            [this.embeddingObject.inputDim, this.embeddingObject.outputDim]
        ]

        
    }

    computeMask(inputs, mask=null) {
        return [
            this.embeddingObject.computeMask(inputs, mask),
            null
        ]
    }

    call(inputs) {
        return [
            this.embeddingObject.call(inputs),
            this.embeddingObject.embeddings.val.clone()
        ]
    }

    // apply(...args) {
    //     return this.embeddingObject.apply(...args);
    // }

    countParams(...args) {
        return this.embeddingObject.countParams(...args);
    }

    build(...args) {
        var buildResult =  this.embeddingObject.build(...args);
        this.embeddings = this.addWeight(
            'embeddings', [this.embeddingObject.inputDim, this.embeddingObject.outputDim], 
            this.embeddingObject.dtype, this.embeddingObject.embeddingsInitializer, 
            this.embeddingObject.embeddingsRegularizer, true,
            this.embeddingObject.embeddingsConstraint);
        return buildResult;
    }

    addLoss(...args) {
        return this.addLoss(...args);
    }

    getConfig(...args) {
        return this.embeddingObject.getConfig(...args);
    }

    dispose(...args) {
        return this.embeddingObject.dispose(...args);
    }

    static get className() {
        return 'EmbeddingRet';
    }
}

tf.serialization.registerClass(EmbeddingRet)

// module.exports = {
//     EmbeddingRet: EmbeddingRet,
// }