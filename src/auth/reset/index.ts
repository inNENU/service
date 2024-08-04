export * from "./handler.js";

//  oldPassword = encryptPassword(oldPassword,pwdDefaultEncryptSalt);
//     newPassword = encryptPassword(newPassword,pwdDefaultEncryptSalt);
//     confirmPassword = encryptPassword(confirmPassword,pwdDefaultEncryptSalt);
//     var _that = $("#new-pwd-confirm");
//     disabledBtn(_that, true);
//     $.ajax({
//         type: "POST",
//         url: contextPath+"/improveInfo/improveInfoUpdatePassword.do",
//         dataType: "json",
//         data: {oldPassword: oldPassword,newPassword:newPassword,confirmPassword:confirmPassword},
//         success: function (data) {
//             disabledBtn(_that, false);
//             var errMsg = data.errMsg;
//             if (errMsg != undefined && errMsg != '') {
//                 var pwdError = data.pwdError;
//                 if(pwdError=="1"){
//                     utils.requireInput($("#formOldPwd"),0,0,$("#oldPwdMsg"),errMsg);
//                 }else if(pwdError=="2"){
//                     utils.requireInput($("#formNewPwd"),0,0,$("#newPwdMsg"),errMsg);
// 				}else{
//                     utils.requireInput($("#formConfirmPwd"),0,0,$("#confirmPwdMsg"),errMsg);
// 				}
//             }else {
//             	//关闭弹窗
//                 closeModal();
// 				var pwdStrength = data.pw
