import Controller from '@ember/controller';

export default Controller.extend({

  actions: {
    upload: function(event) {
      console.log(event);
    },
    uploadCsv() {
      var self = this;
      let fileInput = Ember.$("#fileSelect")[0];
      console.log()
      let file = fileInput.files[0]

      if (file) {

        var buffer = file;
        AWS.config.update({
          "accessKeyId": "AKIAJFGPIN2UJMKYK5LA",
          "secretAccessKey": "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"
        });
        var s3 = new AWS.S3({
          signatureVersion: 'v4'
        });
        var params = {
          Bucket: 'ext-file-upload',
          Key: file.name,
          ContentType: file.type,
          Body: file,
          ACL: 'public-read'
        };
        var startTime = new Date();
        var partNum = 0;
        var partSize = 1024 * 1024 * 5; // Minimum 5MB per chunk (except the last part) http://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadComplete.html
        var numPartsLeft = Math.ceil(file.size / partSize);
        var maxUploadTries = 3;
        var multiPartParams = {
          Bucket: 'ext-file-upload',
          Key: file.name,
          ContentType: file.type,
        };
        var multipartMap = {
          Parts: []
        };
        var partsStatus = [];

        // Multipart
        console.log("Creating multipart upload for:");
        s3.createMultipartUpload(multiPartParams, function(mpErr, multipart) {
          if (mpErr) {
            console.log('Error!', mpErr);
            return;
          }
          console.log("Got upload ID", multipart.UploadId);

          // Grab each partSize chunk and upload it as a part
          for (var rangeStart = 0; rangeStart < buffer.size; rangeStart += partSize) {
            partNum++;
            var end = Math.min(rangeStart + partSize, buffer.size),
              partParams = {
                Body: buffer.slice(rangeStart, end),
                Bucket: 'ext-file-upload',
                Key: file.name,
                PartNumber: String(partNum),
                UploadId: multipart.UploadId
              };

            // Send a single part
            console.log('Uploading part: #', partParams.PartNumber, ', Range start:', rangeStart);
            var p1 = new Promise((resolve, reject) => {
              resolve(self.uploadPart(s3, multipart, partParams, 1, 3, numPartsLeft, file.name, 'ext-file-upload'));
            });
            p1.then((data) => {

              multipartMap.Parts[data.partParams.PartNumber - 1] = {
                ETag: data.mData.ETag,
                PartNumber: Number(data.partParams.PartNumber)
              };
              console.log("Completed part", data.partParams.PartNumber);
              console.log('mData', data.mData);
              partsStatus.push('completed');
              if (partsStatus.length !== numPartsLeft) return;

              var doneParams = {
                Bucket: partParams.Bucket,
                Key: partParams.Key,
                MultipartUpload: multipartMap,
                UploadId: multipart.UploadId
              };

              console.log("Completing upload...");
              self.completeMultipartUpload(s3, doneParams);
            })
          }
        });
      } else {
        results.innerHTML = 'Nothing to upload.';
      }

    }
  },
  uploadPart(s3, multipart, partParams, tryNum, maxUploadTries, numPartsLeft, fileName, bucket) {
    var tryNum = tryNum || 1;
    var maxUploadTries = maxUploadTries || 3;
    var multipartMap = {
      Parts: []
    };
    return new Promise(function(resolve, reject) {
      s3.uploadPart(partParams, (multiErr, mData) => {
        if (multiErr) {
          console.log('multiErr, upload part error:', multiErr);
          if (tryNum < maxUploadTries) {
            console.log('Retrying upload of part: #', partParams.PartNumber)
            this.uploadPart(s3, multipart, partParams, tryNum + 1, 3, numPartsLeft, file.name, 'ext-file-upload');
          } else {
            console.log('Failed uploading part: #', partParams.PartNumber)
          }
        }
        var data = {
          'mData': mData,
          "partParams": partParams
        }
        resolve(data);
      });
    });
  },
  completeMultipartUpload(s3, doneParams) {
    s3.completeMultipartUpload(doneParams, function(err, data) {
      if (err) {
        console.log("An error occurred while completing the multipart upload");
        console.log(err);
      } else {
        var delta = (new Date() - startTime) / 1000;
        console.log('Completed upload in', delta, 'seconds');
        console.log('Final upload data:', data);
      }
    });
  }
});