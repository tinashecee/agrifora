const SENDMAIL = require("../mailer.js");

const SENDACTIVATEACCOUNTEMAIL = async (userName, date, email) => {
  const message = "Your Agrifora Account has been added!";
  const options = {
    from: "Agrifora", // sender address
    to: email, // receiver email
    subject: `Your Agrifora account has been created`, // Subject line
    text: message,
    html: `
	<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>

    <style type="text/css">
       

        /* Style the button */
        table[class="buttonScale"] td {
            background-color: #008000 !important; /* Change button background color to green */
            color: white !important; /* Change button font color to white */
            font-weight: 600;
            -webkit-border-radius: 5px;
            -moz-border-radius: 5px;
            border-radius: 5px;
            padding-left: 25px;
            padding-right: 25px;
            font-family: Helvetica, Arial, sans-serif, 'Open Sans';
            font-size: 13px;
        }

        /* Change background color of tables */
      
    </style>

</head>
<body>

<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#111d2f" style="background-color: #111d2f;">
    <tbody>
    <tr>
        <td width="100%" valign="top">

            <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody>
                <tr>
                    <td>

                        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                            <tbody>
                            <tr>
                                <td width="100%" height="50"></td>
                            </tr>
                            </tbody>
                        </table>

                    </td>
                </tr>
                </tbody>
            </table>

        </td>
    </tr>
    </tbody>
</table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full"></table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full"></table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" style="pointer-events: auto; top: 0px; left: 0px;"></table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
    <tbody>
    <tr>
        <td width="100%" valign="top" bgcolor="#f3f3f3">

            <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody>
                <tr>
                    <td>

                        <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                            <tbody>
                            <tr>
                                <td width="100%">

                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" class="full">
                                        <tbody>
                                        <tr>
                                            <td width="100%" height="70"></td>
                                        </tr>
                                        </tbody>
                                    </table>

                                    <table width="184" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" class="fullCenter">
                                        <tbody>
                                        <tr>
                                            <td width="100%" class="img184" style="background-color: #111d2f;">
                                                <a href="#" style="text-decoration: none;">
                                                    <img src="https://agrifora.co.zw/wp-content/uploads/2021/06/Wide-AgriFora-Logo-02.png" editable="true" width="184" height="auto" style="width: 184px;" alt="" border="0" class="hover toModifyImage">
                                                </a>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>

                                    <table width="1" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" class="full">
                                        <tbody>
                                        <tr>
                                            <td width="100%" height="40"></td>
                                        </tr>
                                        </tbody>
                                    </table>

                                    <table width="375" border="0" cellpadding="0" cellspacing="0" align="right" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" class="fullCenter">
                                        <tbody>
                                        <tr>
                                            <td width="100%" style="font-size: 26px; color: #4e4e4e; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 32px; vertical-align: top; font-weight: 600;">
                                                Agrifora Account Created
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="100%" height="25"></td>
                                        </tr>
                                        <tr>
                                            <td width="100%" style="font-size: 14px; color: #8d9499; text-align: left; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 26px; vertical-align: top; font-weight: 400;" class="fullCenter">
                                                <strong><span style="color: rgb(0, 0, 0);">Dear ${userName}</span></strong><br><br><br><span style="color: rgb(0, 0, 0);">Your account on the Agrifora System has been created successfully. To verify your account and set your password, please click on the following link:</span></p><p><a href="http://localhost:8080/setpassword?email=${email}">ACTIVATION LINK</a></p><p><span style="color: rgb(0, 0, 0);">Date Added:</span></strong> ${date}<br><strong><span style="color: rgb(0, 0, 0);">Notes: Once you have clicked on the link, you will be prompted to enter a new password for your account. Please choose a strong password that is at least 8 characters long and includes a mix of upper and lowercase letters, numbers, and symbols.</span></strong> <p><span style="color: rgb(0, 0, 0);">After you have entered your new password, you will be able to log in to your account.</span></p><p>If you have any questions, please do not hesitate to contact us.</p><br>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="100%" height="45"></td>
                                        </tr>
                                        <!-- Button Left -->
                                        <tr>
                                            <td width="100%" class="buttonScale" align="left">

                                                <span class="featuredHolder"><span class="featuredHolder"><table border="0" cellpadding="0" cellspacing="0" align="left" class="buttonScale">
                                                    <tbody>
                                                    <tr>
                                                        <td width="100%" align="center" height="38" bgcolor="#fc505a" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; padding-left: 25px; padding-right: 25px; font-weight: 600; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; color: #ffffff; font-size: 13px;">
                                                            <multiline><a href="http://localhost:8080/set-password?email=${email}" style="color: #ffffff; font-size: 13px; text-decoration: none; line-height: 13px; width: 100%;">Activate Account</a></multiline>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table></span></span>

                                            </td>
                                        </tr>
                                        <!-- End Button Left -->
                                        <tr>
                                            <td width="100%" height="18"></td>
                                        </tr>
                                        </tbody>
                                    </table>

                                </td>
                            </tr>
                            </tbody>
                        </table>

                        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;" class="full">
                            <tbody>
                            <tr>
                                <td width="100%" height="70"></td>
                            </tr>
                            </tbody>
                        </table>

                    </td>
                </tr>
                </tbody>
            </table>

        </td>
    </tr>
    <!--—EndModule-->
    </tbody>
</table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#23282b" style="background-color: rgb(35, 40, 43);">
    <tbody>
    <tr>
        <td width="100%" valign="top">

            <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody>
                <tr>
                    <td width="100%">

                        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="text-align: center;" class="fullCenter">
                            <tbody>
                            <tr>
                                <td width="100%" height="25"></td>
                            </tr>
                            <tr>
                                <td width="100%" style="text-align: center; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; font-size: 13px; color: #8d9499; font-weight: 400;" class="fullCenter">
                                    <span style="color: #ffffff;" ><br data-mce-bogus="1"></span></p><p><span style="color: #ffffff;" >© 2024 All rights Reserved - Powered by <strong><a href="https://soxfort.com" >Soxfort Solutions</a> </strong>| Intuitive Innovation</span>
                                </td>
                            </tr>
                            <tr>
                                <td width="100%" height="24"></td>
                            </tr>
                            <tr>
                                <td width="100%" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                            </tr>
                            </tbody>
                        </table>

                    </td>
                </tr>
                </tbody>
            </table>
        </td>
    </tr>
    <!--—EndModule-->
    </tbody>
</table>
</body>
        `,
  };
  // send mail with defined transport object and mail options
  SENDMAIL(options, (info) => {});
};

module.exports = SENDACTIVATEACCOUNTEMAIL;
