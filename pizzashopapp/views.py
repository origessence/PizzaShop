from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from pizzashopapp.forms import UserForm, PizzaShopForm, UserFormForEdit , PizzaForm

from django.contrib.auth.models import User
from django.contrib.auth import login,authenticate

from pizzashopapp.models import Pizza

# Create your views here.
def home(request):
    return redirect(pizzashop_home)


@login_required(login_url='/pizzashop/sign-in')
def pizzashop_home(request):
    return redirect(pizza)

@login_required(login_url='/pizzashop/sign-in')
def pizzashop_account(request):
    user_form = UserFormForEdit(instance=request.user)
    pizzashop_form = PizzaShopForm(instance=request.user.pizzashop)

    if request.method == "POST":
        user_form = UserFormForEdit(request.POST, instance=request.user)
        pizzashop_form = PizzaShopForm(request.POST, request.FILES, instance=request.user.pizzashop)

        if user_form.is_valid() and pizzashop_form.is_valid():
            user_form.save()
            pizzashop_form.save()




    return render(request, 'pizzashop/account.html',{
        'user_form':user_form,
        'pizzashop_form':pizzashop_form

    })


@login_required(login_url='/pizzashop/sign-in')
def pizza(request):
    #запрос из текущей пиццерия которая связанна с владельцем
    pizzas = Pizza.objects.filter(pizzashop=request.user.pizzashop).order_by("-id")
    return render(request, 'pizzashop/pizza.html',{
    'pizzas':pizzas
    })


@login_required(login_url='/pizzashop/sign-in')
def pizzashop_add_pizza(request):
    form = PizzaForm()
    if request.method == "POST":
        form = PizzaForm(request.POST, request.FILES)
        if form.is_valid():
            pizza = form.save(commit=False)
            #кладем пиццу в пиццерию
            pizza.pizzashop = request.user.pizzashop
            pizza.save()
            return redirect(pizzashop_home)

    return render(request, 'pizzashop/add_pizza.html',{
        'form':form
    })



@login_required(login_url='/pizzashop/sign-in')
def pizzashop_edit_pizza(request,pizza_id):
        form = PizzaForm(instance = Pizza.objects.get(id = pizza_id))
        if request.method == "POST":
            form = PizzaForm(request.POST, request.FILES, instance = Pizza.objects.get(id = pizza_id))
            if form.is_valid():
                pizza = form.save()
                return redirect(pizzashop_home)

        return render(request, 'pizzashop/edit_pizza.html',{
            'form':form
        })




def pizzashop_sign_up(request):
    user_form = UserForm
    pizzashop_form = PizzaShopForm

#в первый раз передает изначальные данные а во  второй раз те что задал клиент
    if request.method =="POST":
        user_form = UserForm(request.POST)
        pizzashop_form = PizzaShopForm(request.POST, request.FILES)
# если все данные введены верно то создает нового пользователя
        if user_form.is_valid() and pizzashop_form.is_valid():
            new_user=User.objects.create_user(**user_form.cleaned_data)
            new_pizzashop = pizzashop_form.save(commit=False)
            new_pizzashop.owner = new_user
            new_pizzashop.save


            login(request, authenticate(
            username = user_form.cleaned_data['username'],
            password = user_form.cleaned_data['password']
            ))


            return redirect (pizzashop_home)



    return render(request, 'pizzashop/sign_up.html',{
        'user_form':user_form,
        'pizzashop_form':pizzashop_form
    })
