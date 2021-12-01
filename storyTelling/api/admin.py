from django.contrib import admin

from .models import Story, Instruction

# Register your models here.
admin.site.register(Story)
admin.site.register(Instruction)
