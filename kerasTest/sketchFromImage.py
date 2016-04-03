import keras
from keras.models import Sequential
from keras.layers.core import Dense, Dropout, Activation, Flatten, Lambda,RepeatVector, Merge
from keras.optimizers import SGD
from keras.layers.recurrent import LSTM
from keras.layers import Convolution2D, MaxPooling2D, ZeroPadding2D
import numpy as np
import theano
import theano.tensor as T

maxlen = 16

outputDim = 128
# first, let's define an image model that
# will encode pictures into 128-dimensional vectors.
# it should be initialized with pre-trained weights.
image_model = Sequential()
image_model.add(Convolution2D(32, 3, 3, border_mode='valid', input_shape=(3, 100, 100)))
image_model.add(Activation('relu'))
image_model.add(Convolution2D(32, 3, 3))
image_model.add(Activation('relu'))
image_model.add(MaxPooling2D(pool_size=(2, 2)))

image_model.add(Convolution2D(64, 3, 3, border_mode='valid'))
image_model.add(Activation('relu'))
image_model.add(Convolution2D(64, 3, 3))
image_model.add(Activation('relu'))
image_model.add(MaxPooling2D(pool_size=(2, 2)))

image_model.add(Flatten())
image_model.add(Dense(128))

def VGG_16(weights_path=None,outputDim=128):
    model = Sequential()
    model.add(ZeroPadding2D((1,1),input_shape=(3,224,224)))
    model.add(Convolution2D(64, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(64, 3, 3, activation='relu'))
    model.add(MaxPooling2D((2,2), strides=(2,2)))

    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(128, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(128, 3, 3, activation='relu'))
    model.add(MaxPooling2D((2,2), strides=(2,2)))

    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(256, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(256, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(256, 3, 3, activation='relu'))
    model.add(MaxPooling2D((2,2), strides=(2,2)))

    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(MaxPooling2D((2,2), strides=(2,2)))

    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(ZeroPadding2D((1,1)))
    model.add(Convolution2D(512, 3, 3, activation='relu'))
    model.add(MaxPooling2D((2,2), strides=(2,2)))

    model.add(Flatten())
    model.add(Dense(4096, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(4096, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(1000, activation='softmax'))

    if weights_path:
        model.load_weights(weights_path)
    model.layers.pop()  
    model.add(Flatten())
    model.add(Dense(outputDim))
    return model


#LSTM size
lstmSize = 16
numLayers = 2
#stroke = [x,y,start,end,jump]
#strokeProb = [mu_x,sigma_x,mu_y,sigma_y,corr, binomial_start,binomial_end,binomial_jump]
image_model = VGG_16('vgg16_weights.h5',outputDim)
image_model.add(RepeatVector(maxlen))


stroke_model = Sequential()
stroke_model.add(LSTM(lstmSize, return_sequences=True, input_shape=(maxlen,5)))
for ii in range(numLayers-1):
    stroke_model.add(Dropout(0.2))
    stroke_model.add(LSTM(lstmSize, return_sequences=True))



# the output of both models will be tensors of shape (samples, max_caption_len, 128).
# let's concatenate these 2 vector sequences.
model = Sequential()
model.add(Merge([image_model, stroke_model], mode='concat', concat_axis=-1))
# let's encode this vector sequence into a single vector
model.add(LSTM(lstmSize+outputDim,  return_sequences=False))

#stroke_model.add(Dropout(0.2))
model.add(Dense(8))
print(T)
def sigmoidForBinaries(weights):
    import theano.tensor as T
    return T.concatenate([weights[:,:5],T.nnet.hard_sigmoid(weights[:,5:])])
#add on a hard_sigmoid for the binaries?
model.add(Lambda(sigmoidForBinaries,(8,)))

positionWeight, startWeight, stopWeight,jumpWeight = (1,1,1,1)

def strokeError(y_true, stroke_pred):
    import theano.tensor as T
    norm_x = y_true[:,0]-stroke_pred[:,0]
    norm_y = y_true[:,1]-stroke_pred[:,2]
    s1s2 = stroke_pred[:,1]*stroke_pred[:,3]
    z = ((norm_x)/stroke_pred[:,1])**2 +  ((norm_y)/stroke_pred[:,3])**2
    z -= 2.0*(stroke_pred[:,4]*norm_x*norm_y)/s1s2
    negRho = 1 - stroke_pred[:,4]**2
    gaussian_loss = T.exp(-z/2.0*negRho)
    denom = 2.0*np.pi*s1s2*T.sqrt(negRho)
    gaussian_loss /= denom

    start_loss =  T.nnet.categorical_crossentropy(y_true[:,2],stroke_pred[:,5])
    stop_loss =  T.nnet.categorical_crossentropy(y_true[:,3],stroke_pred[:,6])
    jump_loss =  T.nnet.categorical_crossentropy(y_true[:,4],stroke_pred[:,7])
    
    return gaussian_loss*positionWeight+start_loss*startWeight+stop_loss*stopWeight+jump_loss*jumpWeight


model.compile(loss=strokeError, optimizer='adadelta')
