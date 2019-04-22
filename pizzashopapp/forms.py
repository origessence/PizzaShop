from django import forms
from django.contrib.auth.models import User
from pizzashopapp.models import PizzaShop, Pizza

class UserForm(forms.ModelForm):
    email = forms.CharField(max_length=30,required=True)
    password = forms.CharField(widget=forms.PasswordInput())
    class Meta:
        model = User
        #какие поля мы хотим отображать
        fields = ('username','password','first_name','last_name','email')


class UserFormForEdit(forms.ModelForm):
    email = forms.CharField(max_length=30,required=True)
    class Meta:
        model = User
        #какие поля мы хотим отображать
        fields = ('first_name','last_name','email')


class PizzaShopForm(forms.ModelForm):
    class Meta:
        model = PizzaShop
        fields = ('name','phone','adress','logo')



class PizzaForm(forms.ModelForm):
    class Meta:
        model = Pizza
        exclude = ('pizzashop',)
