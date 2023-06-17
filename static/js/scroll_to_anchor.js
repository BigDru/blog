const anchor = window.location.hash
if (anchor)
{
    window.addEventListener("load", function(){
        var target = anchor.substring(1);
        var element = document.getElementById(target);

        if (element)
        {
            element.scrollIntoView();
        }
    })
}
