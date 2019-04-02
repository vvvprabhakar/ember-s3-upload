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
        debugger;
        var buffer = file;
        AWS.config.update({
          "accessKeyId": "AKIAJFGPIN2UJMKYK5LA",
          "secretAccessKey": "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"
        });
        //    var s3 = new AWS.S3();
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

        // s3.putObject(params, function(err, res) {
        //   if (err) {
        //     console.log(err)
        //   } else {
        //
        //   }
        // });
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
            self.uploadPart(s3, multipart, partParams, 1, 3, numPartsLeft, file.name, 'ext-file-upload');
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
    s3.uploadPart(partParams, (multiErr, mData) => {
      debugger;
      if (multiErr) {
        console.log('multiErr, upload part error:', multiErr);
        if (tryNum < maxUploadTries) {
          console.log('Retrying upload of part: #', partParams.PartNumber)
          this.uploadPart(s3, multipart, partParams, tryNum + 1, 3, numPartsLeft, file.name, 'ext-file-upload');
        } else {
          console.log('Failed uploading part: #', partParams.PartNumber)
        }
        return;
      }
      multipartMap.Parts[partParams.PartNumber - 1] = {
        ETag: mData.ETag,
        PartNumber: Number(partParams.PartNumber)
      };
      console.log("Completed part", partParams.PartNumber);
      console.log('mData', mData);
      if (partParams.PartNumber != numPartsLeft) return; // complete only when all parts uploaded

      var doneParams = {
        Bucket: bucket,
        Key: fileName,
        MultipartUpload: multipartMap,
        UploadId: multipart.UploadId
      };

      console.log("Completing upload...");
      //this.completeMultipartUpload(s3, doneParams);
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

/*




// Upload
var startTime = new Date();
var partNum = 0;
var partSize = 1024 * 1024 * 5; // Minimum 5MB per chunk (except the last part) http://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadComplete.html
var numPartsLeft = Math.ceil(buffer.length / partSize);
var maxUploadTries = 3;
var multiPartParams = {
    Bucket: bucket,
    Key: fileKey,
    ContentType: 'application/pdf'
};
var multipartMap = {
    Parts: []
};

function completeMultipartUpload(s3, doneParams) {
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

function uploadPart(s3, multipart, partParams, tryNum) {
  var tryNum = tryNum || 1;
  s3.uploadPart(partParams, function(multiErr, mData) {
    if (multiErr){
      console.log('multiErr, upload part error:', multiErr);
      if (tryNum < maxUploadTries) {
        console.log('Retrying upload of part: #', partParams.PartNumber)
        uploadPart(s3, multipart, partParams, tryNum + 1);
      } else {
        console.log('Failed uploading part: #', partParams.PartNumber)
      }
      return;
    }
    multipartMap.Parts[this.request.params.PartNumber - 1] = {
      ETag: mData.ETag,
      PartNumber: Number(this.request.params.PartNumber)
    };
    console.log("Completed part", this.request.params.PartNumber);
    console.log('mData', mData);
    if (--numPartsLeft > 0) return; // complete only when all parts uploaded

    var doneParams = {
      Bucket: bucket,
      Key: fileKey,
      MultipartUpload: multipartMap,
      UploadId: multipart.UploadId
    };

    console.log("Completing upload...");
    completeMultipartUpload(s3, doneParams);
  });
}

// Multipart
console.log("Creating multipart upload for:", fileKey);
s3.createMultipartUpload(multiPartParams, function(mpErr, multipart){
  if (mpErr) { console.log('Error!', mpErr); return; }
  console.log("Got upload ID", multipart.UploadId);

  // Grab each partSize chunk and upload it as a part
  for (var rangeStart = 0; rangeStart < buffer.length; rangeStart += partSize) {
    partNum++;
    var end = Math.min(rangeStart + partSize, buffer.length),
        partParams = {
          Body: buffer.slice(rangeStart, end),
          Bucket: bucket,
          Key: fileKey,
          PartNumber: String(partNum),
          UploadId: multipart.UploadId
        };

    // Send a single part
    console.log('Uploading part: #', partParams.PartNumber, ', Range start:', rangeStart);
    uploadPart(s3, multipart, partParams);
  }
});




<script type="text/javascript">
    var fileChooser = document.getElementById('file-chooser');
    var button = document.getElementById('upload-button');
    var results = document.getElementById('results');
    button.addEventListener('click', function () {
        var file = fileChooser.files[0];
        if (file) {
			AWS.config.update({
				"accessKeyId": "[SECRET KEY]",
				"secretAccessKey": "[SECRET ACCESS KEY]",
				"region": "us-east-1"
			});
			var s3 = new AWS.S3();
			var params = {
				Bucket: '[YOUR-BUCKET]',
				Key: file.name,
				ContentType: file.type,
				Body: file,
				ACL: 'public-read'
			};
			s3.putObject(params, function (err, res) {
				if (err) {
					results.innerHTML = ("Error uploading data: ", err);
				} else {
					results.innerHTML = ("Successfully uploaded data");
				}
			});
        } else {
            results.innerHTML = 'Nothing to upload.';
        }
    }, false);
</script>*/