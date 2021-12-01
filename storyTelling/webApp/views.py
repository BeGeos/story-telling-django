from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.urls import reverse
from django.contrib import messages

from api.models import Story
from .forms import RichFormField, UpdateRichFormField


def home(request):
    add_rich_text_form = RichFormField()
    update_rich_text_form = UpdateRichFormField()
    return render(request, "index.html", context={"add_form" : add_rich_text_form, "update_form": update_rich_text_form})


def not_found(request):
    return render(request, "notFound.html", status=404)


def story(request, slug):
    try:
        query = Story.objects.get(slug=slug)
        return render(request, "story.html", context={"story": query})
    except Story.DoesNotExist:
        return redirect(reverse("Not-Found-web"))


def write_a_story(request):
    return render(request, "write.html")


def login_view(request):
    """
    If user is authenticated --> redirect to homepage
    else validate and log in
    """
    if request.user.is_authenticated:
        return redirect(reverse("homepage"))

    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect(reverse("homepage"))
        else:
            messages.error(request, "Invalid Credentials")
    return render(request, "login.html")


def logout_view(request):
    logout(request)
    return redirect(reverse("homepage"))
