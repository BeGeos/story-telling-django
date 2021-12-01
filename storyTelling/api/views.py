from django.shortcuts import render
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from django.db import IntegrityError
from django.db.models import F
from django.contrib.auth.decorators import login_required, permission_required
from django.utils.decorators import method_decorator

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view

from delta import html
from bs4 import BeautifulSoup
import json

# Models
from .models import Story, StoryMetric, GlobalMetric, Instruction

# Serializers
from .serializer import StorySerializer, InstructionSerializer

# Utils Mails
from .utils.mail_utils import send_email


def home_api(request):
    return HttpResponse("<h1>This is the API home view</h1>")


@api_view(["GET", "POST", "PUT", "DELETE"])
def not_found(request):
    return Response({
        "message": f"Page Not Found @ {request.get_full_path()}"
    }, status=404)


@api_view(["POST"])
def write_a_story(request):
    data = request.data
    if not data or data == "":
        return Response({"message": "Body can't be empty"}, status=400)
    
    # Compose mail message and send
    title = data.get("title")
    content = data.get("content")
    headline = data.get("headline")
    author = data.get("author")
    # Validation for required fields
    if not title or not headline or not content or not author:
        return Response({
            "message": "title, headline, content and author are required",
            "error": "AttributeError"
        }, status=400)
    
    try:
        send_email(title, headline, content, author)
        return Response({"message": "story is received"}, status=200)
    except Exception as e:
        return Response({
            "message": str(e),
            "error": "InternalError"
        }, status=500)


@api_view(["PUT"])
def like_story(request, slug):
    try:
        story = Story.objects.get(slug=slug)
        story.likes += 1
        story.save()
        return Response(status=200)
    except Story.DoesNotExist:
        return Response({
            "message": "Story does not exist",
            "error": "NotFoundError"
        }, status=404)


@api_view(["PUT"])
def unlike_story(request, slug):
    try:
        story = Story.objects.get(slug=slug)
        story.likes -= 1
        story.save()
        return Response(status=200)
    except Story.DoesNotExist:
        return Response({
            "message": "Story does not exist",
            "error": "NotFoundError"
        }, status=404)


@api_view(["PUT"])
def add_view_story(request, slug):
    try:
        story = Story.objects.get(slug=slug)
        story.views += 1
        story.save()
        return Response(status=200)
    except Story.DoesNotExist:
        return Response({
            "message": "Story does not exist",
            "error": "NotFoundError"
        }, status=404)


@api_view(["PUT"])
def like_instruction(request, slug):
    try:
        Instruction.objects.filter(slug=slug).update(up_votes=F("up_votes") + 1)
        return Response(status=200)
    except Instruction.DoesNotExist:
        return Response({
            "message": "Instruction does not exist",
            "error": "NotFoundError"
        }, status=404)


@api_view(["PUT"])
def unlike_instruction(request, slug):
    try:
        Instruction.objects.filter(slug=slug).update(down_votes=F("down_votes") + 1)
        return Response(status=200)
    except Instruction.DoesNotExist:
        return Response({
            "message": "Instruction does not exist",
            "error": "NotFoundError"
        }, status=404)


class StoryView(APIView):
    queryset = Story.objects.select_related("author")  # reduces hits to the DB
    ORDERS = ["likes", "views", "created_at"]  # allowed ordering in request

    def get(self, request, *args, **kwargs):
        """
        if request has id in path it's for single story
        Otherwise all stories
        """

        if "slug" in self.kwargs.keys():
            try:
                story = self.queryset.get(slug=self.kwargs["slug"])
                serializer = StorySerializer(story)
                return Response(serializer.data, status=200)
            except Story.DoesNotExist:
                return Response({
                    "message": "Story not found",
                    "error": "NotFoundError"
                }, status=404)

        qs_size = len(self.queryset.all())
        # For query parameters
        try:
            limit = int(request.GET.get("limit", qs_size))
            offset = int(request.GET.get("offset", 0))  # offset on record
        except ValueError:
            return Response({
                "message": "Limit or Offset value is not valid",
                "error": "ValueError"
            }, status=422)

        order = request.GET.get("order", "created_at")
        if order not in self.ORDERS:
            order = "created_at"
        stories = self.queryset.all().order_by(order).reverse()[offset:offset+limit]  # reverse to make it desc
        serializer = StorySerializer(stories, many=True)

        response = {
            "stories": serializer.data,
            "meta": {
                "total": qs_size,
                "count": len(stories),
                "remaining": (qs_size - len(stories))
            },
            "auth": 1 if request.user.is_authenticated else 0
        }

        return Response(response, status=200)

    @method_decorator(permission_required("api.add_story", raise_exception=True))
    def post(self, request, *args, **kwargs):
        """
        Post route to story to create a story
        """
        data = request.data
        title = data.get("title")
        headline = data.get("headline")
        rich_content = data.get("content")  # delta object -> Quill
        image_url = data.get("image_url")

        # Validation for required fields
        if not title or not headline or not rich_content or not image_url:
            return Response({
                "message": "title, headline, content and image_url are required",
                "error": "AttributeError"
            }, status=400)

        # Logged in user only if super user
        author = request.user
        json_quill_content = json.loads(rich_content)
        quill_content = json_quill_content.get("html")
        content = BeautifulSoup(quill_content).get_text()

        try:
            new_story = Story.objects.create(
                title=title,
                headline=headline,
                content=content,
                rich_content=quill_content,
                image_url=image_url,
                author=author
            )
        except IntegrityError:
            return Response({
                "message": "There is something wrong with the data",
                "error": "IntegrityError"
            }, status=422)
        except Exception as e:
            return Response({
                "message": "something went wrong",
                "error": "InternalError"
            }, status=500)

        serializer = StorySerializer(new_story)
        return Response(serializer.data, status=201)

    @method_decorator(permission_required("api.change_story", raise_exception=True))
    def put(self, request, *args, **kwargs):
        """
        Change or update story based on slug field
        """
        if "slug" not in self.kwargs.keys():
            return Response({
                "message": "no slug detected",
                "error": "AttributeError"
            }, status=400)

        data = request.data
        if len(data) == 0:
            return Response(status=204)
        title = data.get("title")
        headline = data.get("headline")
        content = data.get("content")
        image_url = data.get("image_url")
        likes = data.get("likes")
        views = data.get("views")

        try:
            story = self.queryset.filter(slug=kwargs.get("slug"))
            _id = story.first().id
            if len(story) == 0:
                return Response({
                    "message": "Story not found",
                    "error": "NotFoundError"
                })

            updated = story.update(
                title=title if title else F("title"),
                content=content if content else F("content"),
                headline=headline if headline else F("headline"),
                image_url=image_url if image_url else F("image_url"),
                likes=F("likes") + likes if likes else F("likes"),
                views=F("views") + views if views else F("views")
            )
            if updated == 0:
                return Response(status=204)

            story.first().save()
        except IntegrityError:
            return Response({
                "message": "There is something wrong with the data",
                "error": "IntegrityError"
            }, status=422)
        except Exception as e:
            return Response({
                "message": "Something went wrong",
                "error": "InternalError"
            }, status=500)

        # Can't use cached queryset because updated, so new query
        response = Story.objects.get(pk=_id)
        serializer = StorySerializer(response, many=False)
        return Response(serializer.data, status=200)

    @method_decorator(permission_required("api.delete_story", raise_exception=True))
    def delete(self, request, *args, **kwargs):
        slug = kwargs.get("slug")
        if not slug:
            return Response(status=204)

        story = self.queryset.get(slug=slug).delete()
        return Response(story, status=200)


class InstructionView(APIView):
    """
    Views for getting, creating, updating and deleting instructions
    """
    queryset = Instruction.objects.select_related()

    def get(self, request, *args, **kwargs):
        """
        Get either all or one instruction
        """
        slug = kwargs.get("slug")
        if slug:
            try:
                instruction = self.queryset.get(slug=slug)
                serializer = InstructionSerializer(instruction, many=False)
                return Response(serializer.data, status=200)
            except Instruction.DoesNotExist:
                return Response({
                    "message": "Instruction not found",
                    "error": "NotFoundError"
                }, status=404)
        instructions = self.queryset.all()
        serializer = InstructionSerializer(instructions, many=True)
        return Response({
            "instructions": serializer.data,
            "meta": {
                "total": len(instructions),
            },
            "auth": 1 if request.user.is_authenticated else 0
        }, status=200)

    @method_decorator(permission_required("api.add_instruction", raise_exception=True))
    def post(self, request, *args, **kwargs):
        """
        Post route to /instruction to create a new instruction
        """
        if "slug" in kwargs.keys():
            return Response(status=204)

        data = request.data
        text = data.get("text")

        # Validation for required fields
        if not text:
            return Response({
                "message": "text is required",
                "error": "AttributeError"
            }, status=400)

        try:
            new_instruction = Instruction.objects.create(text=text)
        except IntegrityError:
            return Response({
                "message": "There is something wrong with the data",
                "error": "IntegrityError"
            }, status=422)
        except Exception as e:
            return Response({
                "message": "something went wrong",
                "error": "InternalError"
            }, status=500)

        serializer = InstructionSerializer(new_instruction, many=False)
        return Response(serializer.data, status=201)

    @method_decorator(permission_required("api.change_instruction", raise_exception=True))
    def put(self, request, *args, **kwargs):
        """
        To update the single instruction --> it needs the slug
        """
        if "slug" not in kwargs.keys():
            return Response(status=204)

        slug = kwargs.get("slug")
        data = request.data
        text = data.get("text")
        up_votes = data.get("up_votes")
        down_votes = data.get("down_votes")

        try:
            instruction = self.queryset.filter(slug=slug)
            if len(instruction) == 0:
                return Response({
                    "message": "Story not found",
                    "error": "NotFoundError"
                })

            updated = instruction.update(
                text=text if text else F("text"),
                up_votes=F("up_votes") + 1 if up_votes else F("up_votes"),
                down_votes=F("down_votes") + 1 if down_votes else F("down_votes")
            )
            if updated == 0:
                return Response(status=204)

            instruction.first().save()
        except IntegrityError:
            return Response({
                "message": "There is something wrong with the data",
                "error": "IntegrityError"
            }, status=422)
        except Exception as e:
            return Response({
                "message": "Something went wrong",
                "error": "InternalError"
            }, status=500)

        # Can't use cached queryset because updated, so new query
        response = Instruction.objects.get(pk=instruction.first().id)
        serializer = InstructionSerializer(response, many=False)
        return Response(serializer.data, status=200)

    @method_decorator(permission_required("api.delete_instruction", raise_exception=True))
    def delete(self, request, *args, **kwargs):
        slug = self.kwargs.get("slug")
        if not slug:
            return Response(status=204)

        instruction = self.queryset.get(slug=slug).delete()
        return Response(instruction, status=200)
