import h5py
import sys
import numpy as np
import scipy.ndimage


imgFile = sys.argv[1]
csvFile = sys.argv[2]


img = scipy.ndimage.imread(imgFile)
img= np.swapaxes(img,0,2)[:3,:,:]
img = np.array([img])
with open(csvFile) as csv:
    data = []
    for line in csv:
        data.append([float(d) for d in line.rstrip().split(',')])

dat = []
next = []
maxLen = int(sys.argv[3])
for ii in range(len(data)):
    lines = []
    for jj in range(-maxLen,0):
        if ii+jj < 0:
            line = [-1,-1,-1,-1,-1]
        else:
            line = data[ii+jj][:-1]
        lines.append(line)
    #print lines
    dat.append(np.array(lines))
    next.append(data[ii])
#print dat
dat = np.array(dat)
next = np.array(next)
print dat.shape
print next.shape


f = h5py.File(sys.argv[4], 'w')

f.create_dataset('imgs',data=img)
f.create_dataset('img_seq',data=np.zeros([dat.shape[0]]))
f.create_dataset('stitch_seq',data=dat)
f.create_dataset('stitch_next',data=next)
f.close()
