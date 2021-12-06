# Email messaging utilities functions
from django.core.mail import send_mail
import json
# just a comment

with open("storyTelling/config.json", "r") as conf_file:
    CONFIG_FILE = json.load(conf_file)


def send_email_from_django(title, headline, content, author):
    try:
        with open("api/message.txt", "r") as file:
            text = file.read()
        message = text
        # Format message
        message = message.replace("__title__", title)
        message = message.replace("__headline__", headline)
        message = message.replace("__content__", content)
        message = message.replace("__author__", author)
        subject = '[Story Telling] - A new story has been submitted'
        sender = CONFIG_FILE['EMAIL_HOST_USER']
        receiver = sender
        send_mail(subject=subject, message=message, recipient_list=[receiver], from_email=sender)
        return True
    except Exception as e:
        print(str(e))
        return False
