(function($) {
    $.fn.wyctoUpload = function(options) {
        var defaults = {
            method: 0,//后上传
            url: "/default/ajax/uploadfile",//服务器保存方法，返回图片src，method设置为1有效
            quality: 1,//0-1
            saveExt: '',//当quality设置时候的保存格式jpg/png
            allowType: ["jpg", "jpeg", "png", "gif", "bmp"],//允许上传格式
            allowSize: 0,//允许上传大小
            success: success,
            error: error
        };

        var config = $.extend(defaults, options);
        var quality = config.quality;
        var saveExt = config.saveExt;
        var success = config.success;
        var error = config.error;

        var tag = parseInt(Math.random() * 1000);
        if($(this).attr('type')=='file'){
            $(this).after('<img src="" id="resource-' + tag + '" style="display:none"/><canvas id="canvas' + tag + '" style="display:none"></canvas>');
            var fileInput = $(this);
        }else{
        	var imgtype = config.allowType;
        	var typestr = "";
        	$.each(imgtype,function(n,value){
                typestr += ",image/" + value;
            });
        	typestr = typestr.substr(1);
            $(this).after('<input id="wycto-fileupload-' + tag + '" type="file" accept="'+typestr+'" multiple="multiple" style="display:none"/><img src="" id="resource-' + tag + '" style="display:none"/><canvas id="canvas' + tag + '" style="display:none"></canvas>');
            var fileInput = $("#wycto-fileupload-" + tag);
            $(this).click(function() {
                fileInput.click();
            });
        }

        var resource = $("#resource-" + tag)[0];
        
        fileInput.each(function(i) {
            fileInput.change(function(e) {
                handleFileSelect(fileInput)
            })
        });

        var handleFileSelect = function(obj) {
            if (typeof FileReader == "undefined") {
                if (typeof(error) == "function") {
                    error("浏览器版本过低,请升级或者更换浏览器再试")
                }
                return false
            }
            var files = obj[0].files;
            var f = files[0];

            if (!isAllowFile(f.name, config.allowType)) {
                if (typeof(error) == "function") {
                    error("请上传 :" + config.allowType + "格式的文件")
                }
                return false
            }
            if (!isAllowSize(f.size, config.allowSize)) {
                if (typeof(error) == "function") {
                    if (config.allowSize < 1024) {
                        size = config.allowSize + "KB"
                    } else {
                        size = config.allowSize / 1024 + "MB"
                    }
                    error("文件大小不超过" + size)
                }
                return false
            }
            var reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = (function(theFile) {
                return function(e) {
                    var tmpSrc = e.target.result;
                    var name = getFileName(f.name);
                    var ext = getFileExt(f.name).toLowerCase();

                    if (tmpSrc.lastIndexOf("data:base64") != -1) {
                        tmpSrc = tmpSrc.replace("data:base64", "data:image/jpeg;base64");
                    } else if (tmpSrc.lastIndexOf("data:,") != -1) {
                        tmpSrc = tmpSrc.replace("data:,", "data:image/jpeg;base64,");
                    }

                    if (quality>0&&quality<1) {
                        resource.src = this.result;
                        var info = {};
                        resource.onload = function() {
                            var file_width = resource.naturalWidth;
                            var file_height = resource.naturalHeight;
                            info = { 'width': file_width, 'height': file_height };
                            if (saveExt != '') {
                                ext = saveExt;
                            }
                            var re = compress(resource, quality, ext, info);
                            tmpSrc = re;
                            upload(tmpSrc, name, ext,0,file_width,file_height);
                        }
                    } else {
                        resource.src = this.result;
                        var info = {};
                        resource.onload = function() {
                            var file_width = resource.naturalWidth;
                            var file_height = resource.naturalHeight;
                            info = { 'width': file_width, 'height': file_height };
                            upload(tmpSrc, name, ext,getSize(f.size),file_width,file_height);
                        }
                    }
                }
            })(f);
        };

        var getFileName = function(fileName) {
            if (!fileName) {
                return ""
            }
            var _index = fileName.lastIndexOf(".");
            if (_index < 1) {
                return ""
            }
            return fileName.substr(0, _index)
        };

        var getFileExt = function(fileName) {
            if (!fileName) {
                return ""
            }
            var _index = fileName.lastIndexOf(".");
            if (_index < 1) {
                return ""
            }
            return fileName.substr(_index + 1)
        };

        var getSize = function(size) {
            size = size/1024;
            if(size>1024){
                size = size/1024;
                if(size>1024){
                    size = size/1024;
                    size = size.toFixed(2) + "GB";
                }else{
                    size = size.toFixed(2) + "MB";
                }
            }else{
                size = size.toFixed(2) + "KB";
            }
            return size;
        };

        var isAllowFile = function(fileName, allowType) {
            var fileExt = getFileExt(fileName).toLowerCase();
            if (!allowType) {
                allowType = ["jpg", "jpeg", "png", "gif", "bmp"]
            }
            if ($.inArray(fileExt, allowType) != -1) {
                return true
            }
            return false
        };

        var isAllowSize = function(fileSize, allowSize) {
            if (config.allowSize > 0 && fileSize > allowSize * 1024) {
                return false
            }
            return true
        };

        /**
         * 压缩图片
         * @param {Image} source_img_obj 图片对象
         * @param {Integer} quality 图片质量
         * @return {Image} output_format 输出图片格式
         * @param {obj} info 图片信息（宽高和大小）
         */
        var compress = function(source_img_obj, quality, output_format, info) {
            var mime_type = "image/jpeg";
            if (output_format != undefined && output_format == "png") {
                mime_type = "image/png";
            }
            var cvs = $("#canvas" + tag)[0]; //document.createElement('canvas');
            cvs.width = info.width;
            cvs.height = info.height;
            var ctx = cvs.getContext("2d").drawImage(source_img_obj, 0, 0);

            var newImageData = cvs.toDataURL(mime_type, quality);
            return newImageData;
        };

        //上传处理
        var upload = function(tmpSrc, name, ext,size,width,height) {
            if (config.method) {
                $.post(config.url, { img: tmpSrc, fileext: ext }, function(data, status) {
                    if (status == "success") {
                        if (typeof(success) == "function") {
                            var respond = {'src':tmpSrc,'name':name,'ext':ext,'size':size,'width':width,'height':height};
                            success(respond);
                        }
                    } else {
                        if (typeof(error) == "function") {
                            error('服务器上传失败!', tmpSrc);
                        }
                    }
                });
            } else {
                if (typeof(success) == "function") {
                    var respond = {'src':tmpSrc,'name':name,'ext':ext,'size':size,'width':width,'height':height};
                    success(respond);
                }
            }
        };
    }
})(jQuery);