# Organization Setup and API Credentials Generation

## Overview

This document provides instructions on how to create an organization and generate the necessary API credentials for your application. These credentials are essential for integrating with external services and managing your organization's settings.

## Table of Contents

1. [Creating an Organization](#creating-an-organization)
2. [Configuring API Credentials](#configuring-api-credentials)
3. [Generate Your Own SMTP Credentials](#generating-your-own-smtp-credentials)
4. [Configuring your SMTP credentials](#configuring-your-smtp-credentials)
5. [Generating Your Cloudinary Credentials](#generating-your-cloudinary-credentials)
6. [Configuring File Storage with Cloudinary](#configuring-file-storage-with-cloudinary)
7. [Generate AWS Credentials](#generating-aws-credentials)
8. [Configuring File Storage with AWS](#configuring-file-storage-with-aws)
8. [Customizing the portal](#customizing-the-portal)
9. [Conclusion](#conclusion)

## Creating an Organization

To create an organization, follow these steps:

1. **Manually Enter the Organization Route:**
   - In your web browser, manually type the route for creating a new organization. This is typically in the format: `/register/org`.

2. **Fill in the Required Fields:**
   - Once you access the organization creation page, fill in the required fields, such as:
     - **Organization Name:** The name of your organization.
     - **Admin Full Name:** The name of the admin for the organization.
     - **Admin Email:** The email address of the admin.
     - **Password:** A secure password for the admin account.
     - **Confirm Password:** Re-enter the password for confirmation.

3. **Save the Organization:**
   - After filling in the details, click the "Register Organization" button.
4. **Confirmation:**
   - Upon successful creation, you should see a confirmation message indicating that the organization has been successfully created. 
   - If there are any errors during the creation process, appropriate error messages will be returned, allowing you to correct the input.
5. **Refresh the Page:**
   - After successfully creating the organization, the login page will be shown. If you are unable to log in, please refresh the page to ensure that all changes are reflected and to access the newly created organization's dashboard.

## Configuring API Credentials

Once your organization is created, you need to configure API credentials for third-party integration.

## Generating Your Own SMTP Credentials

To set up your SMTP credentials for sending emails, follow these steps:

1. **Choose an Email Service Provider:**
   - Select an email service provider that supports SMTP. Most commonly used option is Gmail.

2. **Create an Account:**
   - Sign up for an account with your chosen email service provider, for example, create a Google account if you choose to continue with Gmail. 
   - If you have it already, you can skip this step.

3. **Locate SMTP Settings:**
   - After creating your account, navigate to the SMTP settings section. This is usually found in the account settings or API settings of your provider. Such as "App Passwords" settings in your Google account settings.

4. **Generate SMTP Credentials:**
   - You will need to generate or find the following credentials:
     - **SMTP_HOST:** This is the server address for your SMTP service. For example, these are commonly used SMTP hosts according to different services:
       - Gmail: `smtp.gmail.com`
       - SendGrid: `smtp.sendgrid.net`
       - Mailgun: `smtp.mailgun.org`
     - **SMTP_PORT:** This is the port number used for SMTP. Common ports include:
       - 587 (for TLS)
       - 465 (for SSL)
       - 25 (for non-secure connections)
     - **SMTP_USER:** This is typically your email address or a username provided by your email service.
     - **SMTP_PASSWORD:** This is your email account password or an API key. If you're using Gmail and have two-factor authentication enabled, you can create an app password for SMTP access. Check your email provider's documentation for details on generating an API key if applicable.
     - **SMTP_FROM:** This is the email address that will show as the sender in outgoing emails, typically the same as your SMTP_USER.

## Configuring your SMTP credentials

Now to configure your application to use Cloudinary for file storage, follow these steps:

1. **Navigate to the Settings Page:**
   - In your application, go to the settings page. This is typically accessible to admins only, from the main navigation menu.

2. **Choose SMTP Configs Option:**
   - On the SMTP configuration page you will see the form to submit your SMTP credentials.

3. **Enter Your SMTP Credentials:**
   - In the SMTP Configs dialog, you will find fields to enter your Cloudinary API credentials:
     - **SMTP Host:** The SMTP server address for your email service provider (e.g., `smtp.gmail.com` for Gmail).
     - **SMTP Port:** The port number used for SMTP (e.g., 587 for TLS, 465 for SSL).
     - **SMTP User:** Your email address or username for the SMTP service.
     - **Displayed Sender Email:** The email address that will appear as the sender in outgoing emails.
     - **SMTP Password:** Your email account password or an API key for SMTP access.

4. **Save Your Credentials:**
   - After entering your SMTP credentials, click the "Save Settings" button to store your credentials securely.

5. **Test Your Configuration:**
   - After entering your SMTP credentials, you can test the SMTP settings by sending a Forgot Password request in your application.
   
By following these steps successfully, you can use the Email related features of this application.

## Generating Your Cloudinary Credentials

To set up your Cloudinary credentials for media management, follow these steps:

1. **Create a Cloudinary Account:**
   - Go to the [Cloudinary website](https://cloudinary.com/) and sign up for a free account.

2. **Access the Dashboard:**
   - After creating your account, log in to your Cloudinary dashboard.

3. **Locate Your API Credentials:**
   - In the dashboard, navigate to the "Go to API Keys" section. Here, you will find your API credentials, which include:
     - **Cloud Name:** Your unique Cloudinary cloud name.
     - **API Key:** The API key for your Cloudinary account.
     - **API Secret:** The secret key for your Cloudinary account.
     - **Cloudinary URL (Optional):** The URL format for accessing your Cloudinary resources. 

## Configuring File Storage with Cloudinary

Now to configure your application to use Cloudinary for file storage, follow these steps:

1. **Navigate to the Settings Page:**
   - In your application, go to the settings page. This is typically accessible to admins only, from the main navigation menu.

2. **Choose Your File Storage Option:**
   - On the settings page, look for the **File Storage** section. You will be prompted to select your preferred file storage option:
     - **Local Storage:** If you choose this option, you do not need to configure any additional settings.
     - **Cloudinary:** If you select this option, you will be asked to enter your Cloudinary credentials in the fields provided.
     - **AWS S3:** If you choose this option, you will be asked to enter your AWS credentials in the fields provided.

3. **Enter Your Cloudinary Credentials:**
   - In the file storage settings dialog, you will find fields to enter your Cloudinary API credentials:
     - **Cloudinary Cloud Name:** Your unique Cloudinary cloud name.
     - **Cloudinary API Key:** The API key for your Cloudinary account.
     - **Cloudinary API Secret:** The secret key for your Cloudinary account.
     - **Cloudinary URL (Optional):** The URL format for accessing your Cloudinary resources.

4. **Save Your Credentials:**
   - After entering your Cloudinary credentials, click the "Save Settings" button to store your credentials securely.

5. **Test Your Configuration:**
   - Once your credentials are saved, you can test the integration by uploading an image or media file through your application. The application will use the provided Cloudinary credentials to manage file uploads.

## Generating AWS Credentials

To set up your AWS credentials for cloud services, follow these steps:

1. **Create an AWS Account:**
   - Go to the [AWS website](https://aws.amazon.com/) and sign up for a free account.

2. **Access the IAM Dashboard:**
   - After creating your account, log in to the AWS Management Console and navigate to the IAM (Identity and Access Management) dashboard.

3. **Create a New User:**
   - Click on "Users" and then "Add user." Enter a username and select the access type (programmatic access is recommended).

4. **Set Permissions:**
   - Choose the permissions for the user. You can attach existing policies directly or create a custom policy based on your needs.

5. **Review and Create:**
   - Review the user details and click "Create user." Make sure to save the Access Key ID and Secret Access Key securely.

## Configuring File Storage with AWS

Now to configure your application to use AWS for file storage, follow these steps:

1. **Navigate to the Settings Page:**
   - In your application, go to the settings page. This is typically accessible to admins only, from the main navigation menu.

2. **Choose Your File Storage Option:**
   - On the settings page, look for the **File Storage** section. You will be prompted to select your preferred file storage option:
     - **Local Storage:** If you choose this option, you do not need to configure any additional settings.
     - **Cloudinary:** If you select this option, you will be asked to enter your Cloudinary credentials in the fields provided.
     - **AWS S3:** If you choose this option, you will be asked to enter your AWS credentials in the fields provided.

3. **Enter Your Cloudinary Credentials:**
   - In the file storage settings dialog, you will find fields to enter your Cloudinary API credentials:
     - **AWS Region:** The region where your AWS resources are located.
     - **AWS Access Key ID:** The access key ID for your AWS account.
     - **AWS Secret Access Key:** The secret access key for your AWS account.
     - **AWS Bucket Name:** The name of the S3 bucket where your files will be stored.

4. **Save Your Credentials:**
   - After entering your AWS credentials, click the "Save Settings" button to store your credentials securely.

5. **Test Your Configuration:**
   - Once your credentials are saved, you can test the integration by uploading an image or media file through your application. The application will use the provided AWS credentials to manage file uploads.

## Customizing The Portal

To customize the portal, follow these steps:

1. **Navigate to the Portal Configuration:**
   - In your application, go to the settings page. This is typically accessible to admins only, from the main navigation menu.

2. **Access the Portal Configuration Dialog:**
   - Look for the **Portal Configuration** section. Here, you can manage various settings related to the portal's appearance and functionality.

3. **Upload a Logo:**
   - You can upload a custom logo for your portal. Click on the upload button and select an image file. The logo will be displayed on the portal.

4. **Set the Portal Name:**
   - Enter a name for your portal in the designated field. This name will be displayed in the header of the portal.

5. **Save Your Changes:**
   - After making your changes, click the "Save Settings" button to apply the new configurations.

By following these steps, you can effectively customize the portal to better fit your organization's branding and needs.

## Conclusion

You have now successfully created an organization and generated the necessary API credentials. These credentials will allow your application to interact with external services securely. If you have any questions or need further assistance, please refer to the documentation or contact support.