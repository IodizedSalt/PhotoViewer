const albumBucketName = config.ALBUM_BUCKET_NAME;
const bucketRegion = config.BUCKET_REGION;
const IdentityPoolId = config.IDENTITY_POOL_ID

const AWSCredentials = {
  accessKey: config.ACCESS_KEY,
  secret: config.SECRET,
  bucketName: config.ALBUM_BUCKET_NAME,
};
const cloudfront_url = config.CLOUDFRONT_URL

const s3 = new AWS.S3({
  accessKeyId: AWSCredentials.accessKey,
  secretAccessKey: AWSCredentials.secret,
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName }
});

function listAlbums() {
  albumName = 'Album1'
  var albumPhotosKey = 'Albums/' + encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
  })
  s3.listObjects({Bucket:'mexicophotoalbum', Delimiter: "/", Prefix: 'Albums/' }, function(err, data) {
    if (err) {
      return alert("There was an error listing your albums: " + err.message);
    } else {
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix.split('/')[1];
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          "<button  onclick=\"viewAlbum('" + albumName + "')\">" + albumName,
          "</button>",
          "</li>"
        ]);
      });
      var message = albums.length
        ? getHtml([
            "<p>Click on an album name to view it.</p>"
          ])
        : "<p>You do not have any albums. Please Create album.";
      var htmlTemplate = [
        "<h2>Albums</h2>",
        message,
        "<ul>",
        getHtml(albums),
        "</ul>",
        "<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
        "Create New Album",
        "</button>"
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
  albumName = albumName.trim();
  if (!albumName) {
    return alert("Album names must contain at least one non-space character.");
  }
  if (albumName.indexOf("/") !== -1) {
    return alert("Album names cannot contain slashes.");
  }
  var albumPath = 'Albums/' + albumName + '/'
  // var albumKey = encodeURIComponent(albumPath);
  var albumKey = albumPath;
  s3.headObject({ Key: albumKey }, function(err, data) {
    if (!err) {
      return alert("Album already exists.");
    }
    if (err.code !== "NotFound") {
      return alert("There was an error creating your album: " + err.message);
    }
    s3.putObject({ Key: albumKey }, function(err, data) {
      if (err) {
        return alert("There was an error creating your album: " + err.message);
      }
      alert("Successfully created album.");
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
  var albumPhotosKey = 'Albums/' + encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";

    var photos = data.Contents.map(function(photo) {
      const valid_file_types = ['.jpg', '.JPG', '.mp3', '.MP3', '.mp4', '.MP4', '.png', '.PNG', '.GIF', '.gif']
      if(photo.Key != albumPhotosKey && valid_file_types.some(v => photo.Key.includes(v))){
        var photoKey = photo.Key;
        var photoUrl = cloudfront_url + encodeURIComponent(photoKey);
        // var photoUrl = 'https://mexicophotoalbum.s3.eu-central-1.amazonaws.com/Albums/Album1/IMG_20210726_161851.jpg'
        return getHtml([
          "<span>",
          "<div>",
          '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
          "</div>",
          "<div>",
          "<span onclick=\"deletePhoto('" +
            albumName +
            "','" +
            photoKey +
            "')\">",
          "X",
          "</span>",
          "<span>",
          photoKey.replace(albumPhotosKey, ""),
          "</span>",
          "</div>",
          "</span>"
        ]);
      }
    });
    var message = photos.length
      ? "<p>Click on the X to delete the photo</p>"
      : "<p>You do not have any photos in this album. Please add photos.</p>";
    var htmlTemplate = [
      "<h2>",
      "Album: " + albumName,
      "</h2>",
      message,
      "<div>",
      getHtml(photos),
      "</div>",
      '<input id="photoupload" type="file" multiple accept="image/*">',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
      "Add Photo",
      "</button>",
      '<button onclick="listAlbums()">',
      "Back To Albums",
      "</button>"
    ];
    document.getElementById("app").innerHTML = getHtml(htmlTemplate);
  });
}

function addPhoto(albumName) {
  var files = document.getElementById("photoupload").files;
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }
  const valid_file_types = ['.jpg', '.JPG', '.mp3', '.MP3', '.mp4', '.MP4', '.png', '.PNG', '.GIF', '.gif']
  if(files.length == 1){
    if(valid_file_types.some(v => files[0].name.includes(v))){
      var file = files[0];
      var fileName = file.name.split('.')[0] + Date.now() + '.' +    file.name.split('.')[1];
      var albumPhotosKey = 'Albums/' + encodeURIComponent(albumName) + "/";
    
      var photoKey = albumPhotosKey + fileName;
    
      var params = {
        Bucket: albumBucketName,
        Key: photoKey,
        Body: file
      }
      s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }else{
          alert('success')
        }
      })
    }else{
      alert('ERROR: Some files were not uploaded. Filetypes must be .jpg, .png, .mp3, .mp4, .png, or .gif \n \n Your other files were uploaded, however. Refresh the page to view them now.')
    }
  }else{
    var promises=[];
    for(var i=0;i<files.length;i++){
        var file = files[i];
        if( valid_file_types.some(v => file.name.includes(v))){
          promises.push(uploadLoadToS3(file, albumName));
        }else{
          var promises=[];
          alert('ERROR: Some files were not uploaded. Filetypes must be .jpg, .png, .mp3, .mp4, .png, or .gif \n \n Your other files were uploaded, however. Refresh the page to view them now.')
          return
        }
    }
    var htmlTemplate = [
      "<h1 class='uploading_text'>uploading</h1>"
    ];
    document.getElementById("app").innerHTML += getHtml(htmlTemplate);
    Promise.all(promises).then((values) => {
      document.getElementsByClassName("uploading_text")[0].remove()
      alert('UPLOAD SUCCESS');
    });
  }
  }

  function uploadLoadToS3(ObjFile, albumName){
    const valid_file_types = ['.jpg', '.JPG', '.mp3', '.MP3', '.mp4', '.MP4', '.png', '.PNG', '.GIF', '.gif']
    if( valid_file_types.some(v => ObjFile.name.includes(v))){
      var fileName = ObjFile.name.split('.')[0] + Date.now() + '.' +   ObjFile.name.split('.')[1]
      var albumPhotosKey = 'Albums/' + encodeURIComponent(albumName) + "/";
      var photoKey = albumPhotosKey + fileName;
      var params = {
        Bucket: albumBucketName,
        Key: photoKey,
        Body: ObjFile
    };
    console.log(params)
    return s3.upload(params).promise();
    }else{
      return
    }
    }

function deletePhoto(albumName, photoKey) {
  s3.deleteObject({ Key: photoKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your photo: ", err.message);
    }
    alert("Successfully deleted photo.");
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
  var albumKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your album: ", err.message);
    }
    var objects = data.Contents.map(function(object) {
      return { Key: object.Key };
    });
    s3.deleteObjects(
      {
        Delete: { Objects: objects, Quiet: true }
      },
      function(err, data) {
        if (err) {
          return alert("There was an error deleting your album: ", err.message);
        }
        alert("Successfully deleted album.");
        listAlbums();
      }
    );
  });
}
